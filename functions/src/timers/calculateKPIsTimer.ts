/**
 * ASORA KPI ANALYTICS TIMER
 * 
 * 🎯 Purpose: Daily KPI calculation and telemetry emission
 * 📊 Metrics: DAU/WAU ratio, retention rates, appeal SLA tracking
 * ⏰ Schedule: Runs daily at 6 AM UTC to capture previous day's data
 * 📈 Analytics: Comprehensive business intelligence for Asora platform
 */

import { app, Timer, InvocationContext } from '@azure/functions';
import { getContainer } from '../shared/cosmosClient';
import { AsoraKPIs, PerformanceTimer } from '../shared/telemetry';

interface UserActivityMetrics {
  dau: number;
  wau: number;
  dauWauRatio: number;
  day1Retention: number;
  day7Retention: number;
}

interface ModerationMetrics {
  avgAppealSlaHours: number;
  falsePositiveRate: number;
  totalAppeals: number;
  uphelAppeals: number;
}

/**
 * Calculate Daily Active Users (DAU)
 */
async function calculateDAU(context: InvocationContext): Promise<number> {
  const timer = new PerformanceTimer('calculate_dau', context);
  
  try {
    const usersContainer = getContainer('users');
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    
    const querySpec = {
      query: `
        SELECT VALUE COUNT(DISTINCT c.userId)
        FROM c 
        WHERE c.lastActiveAt >= @yesterday
          AND c.lastActiveAt < @today
      `,
      parameters: [
        { name: '@yesterday', value: yesterday.toISOString() },
        { name: '@today', value: new Date().toISOString() }
      ]
    };
    
    const { resources } = await usersContainer.items.query<number>(querySpec).fetchAll();
    const dau = resources[0] || 0;
    
    timer.stopAndTrack({ metric_type: 'dau' });
    context.info(`📊 DAU calculated: ${dau}`);
    
    return dau;
    
  } catch (error) {
    timer.stop();
    context.error('Error calculating DAU:', error);
    return 0;
  }
}

/**
 * Calculate Weekly Active Users (WAU)
 */
async function calculateWAU(context: InvocationContext): Promise<number> {
  const timer = new PerformanceTimer('calculate_wau', context);
  
  try {
    const usersContainer = getContainer('users');
    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    weekAgo.setUTCHours(0, 0, 0, 0);
    
    const querySpec = {
      query: `
        SELECT VALUE COUNT(DISTINCT c.userId)
        FROM c 
        WHERE c.lastActiveAt >= @weekAgo
      `,
      parameters: [
        { name: '@weekAgo', value: weekAgo.toISOString() }
      ]
    };
    
    const { resources } = await usersContainer.items.query<number>(querySpec).fetchAll();
    const wau = resources[0] || 0;
    
    timer.stopAndTrack({ metric_type: 'wau' });
    context.info(`📊 WAU calculated: ${wau}`);
    
    return wau;
    
  } catch (error) {
    timer.stop();
    context.error('Error calculating WAU:', error);
    return 0;
  }
}

/**
 * Calculate Day 1 retention rate
 */
async function calculateDay1Retention(context: InvocationContext): Promise<number> {
  const timer = new PerformanceTimer('calculate_day1_retention', context);
  
  try {
    const usersContainer = getContainer('users');
    const twoDaysAgo = new Date();
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    twoDaysAgo.setUTCHours(0, 0, 0, 0);
    
    const oneDayAgo = new Date();
    oneDayAgo.setUTCDate(oneDayAgo.getUTCDate() - 1);
    oneDayAgo.setUTCHours(0, 0, 0, 0);
    
    // Users who joined 2 days ago
    const newUsersQuery = {
      query: `
        SELECT VALUE COUNT(1)
        FROM c 
        WHERE c.createdAt >= @twoDaysAgo
          AND c.createdAt < @oneDayAgo
      `,
      parameters: [
        { name: '@twoDaysAgo', value: twoDaysAgo.toISOString() },
        { name: '@oneDayAgo', value: oneDayAgo.toISOString() }
      ]
    };
    
    const { resources: newUsers } = await usersContainer.items.query<number>(newUsersQuery).fetchAll();
    const newUserCount = newUsers[0] || 0;
    
    if (newUserCount === 0) {
      timer.stop();
      return 0;
    }
    
    // Users who joined 2 days ago AND were active yesterday
    const retainedUsersQuery = {
      query: `
        SELECT VALUE COUNT(1)
        FROM c 
        WHERE c.createdAt >= @twoDaysAgo
          AND c.createdAt < @oneDayAgo
          AND c.lastActiveAt >= @oneDayAgo
      `,
      parameters: [
        { name: '@twoDaysAgo', value: twoDaysAgo.toISOString() },
        { name: '@oneDayAgo', value: oneDayAgo.toISOString() }
      ]
    };
    
    const { resources: retainedUsers } = await usersContainer.items.query<number>(retainedUsersQuery).fetchAll();
    const retainedUserCount = retainedUsers[0] || 0;
    
    const retentionRate = newUserCount > 0 ? retainedUserCount / newUserCount : 0;
    
    timer.stopAndTrack({ metric_type: 'day1_retention' });
    context.info(`📊 Day 1 retention: ${(retentionRate * 100).toFixed(2)}% (${retainedUserCount}/${newUserCount})`);
    
    return retentionRate;
    
  } catch (error) {
    timer.stop();
    context.error('Error calculating Day 1 retention:', error);
    return 0;
  }
}

/**
 * Calculate Day 7 retention rate
 */
async function calculateDay7Retention(context: InvocationContext): Promise<number> {
  const timer = new PerformanceTimer('calculate_day7_retention', context);
  
  try {
    const usersContainer = getContainer('users');
    const eightDaysAgo = new Date();
    eightDaysAgo.setUTCDate(eightDaysAgo.getUTCDate() - 8);
    eightDaysAgo.setUTCHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    
    // Users who joined 8 days ago (cohort for 7-day retention)
    const cohortQuery = {
      query: `
        SELECT VALUE COUNT(1)
        FROM c 
        WHERE c.createdAt >= @eightDaysAgo
          AND c.createdAt < @sevenDaysAgo
      `,
      parameters: [
        { name: '@eightDaysAgo', value: eightDaysAgo.toISOString() },
        { name: '@sevenDaysAgo', value: sevenDaysAgo.toISOString() }
      ]
    };
    
    const { resources: cohortUsers } = await usersContainer.items.query<number>(cohortQuery).fetchAll();
    const cohortSize = cohortUsers[0] || 0;
    
    if (cohortSize === 0) {
      timer.stop();
      return 0;
    }
    
    // Users from that cohort who were active in the last 7 days
    const retainedQuery = {
      query: `
        SELECT VALUE COUNT(1)
        FROM c 
        WHERE c.createdAt >= @eightDaysAgo
          AND c.createdAt < @sevenDaysAgo
          AND c.lastActiveAt >= @sevenDaysAgo
      `,
      parameters: [
        { name: '@eightDaysAgo', value: eightDaysAgo.toISOString() },
        { name: '@sevenDaysAgo', value: sevenDaysAgo.toISOString() }
      ]
    };
    
    const { resources: retainedUsers } = await usersContainer.items.query<number>(retainedQuery).fetchAll();
    const retainedCount = retainedUsers[0] || 0;
    
    const retentionRate = cohortSize > 0 ? retainedCount / cohortSize : 0;
    
    timer.stopAndTrack({ metric_type: 'day7_retention' });
    context.info(`📊 Day 7 retention: ${(retentionRate * 100).toFixed(2)}% (${retainedCount}/${cohortSize})`);
    
    return retentionRate;
    
  } catch (error) {
    timer.stop();
    context.error('Error calculating Day 7 retention:', error);
    return 0;
  }
}

/**
 * Calculate appeal SLA metrics
 */
async function calculateAppealMetrics(context: InvocationContext): Promise<ModerationMetrics> {
  const timer = new PerformanceTimer('calculate_appeal_metrics', context);
  
  try {
    const appealsContainer = getContainer('appeals');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    
    // Get resolved appeals from last 30 days
    const resolvedAppealsQuery = {
      query: `
        SELECT c.createdAt, c.resolvedAt, c.status, c.reviewerDecision
        FROM c 
        WHERE c.status IN ('resolved', 'dismissed')
          AND c.resolvedAt >= @thirtyDaysAgo
      `,
      parameters: [
        { name: '@thirtyDaysAgo', value: thirtyDaysAgo.toISOString() }
      ]
    };
    
    const { resources: appeals } = await appealsContainer.items.query(resolvedAppealsQuery).fetchAll();
    
    if (appeals.length === 0) {
      timer.stop();
      return {
        avgAppealSlaHours: 0,
        falsePositiveRate: 0,
        totalAppeals: 0,
        uphelAppeals: 0
      };
    }
    
    // Calculate average resolution time in hours
    const totalResolutionTime = appeals.reduce((sum, appeal) => {
      const createdAt = new Date(appeal.createdAt);
      const resolvedAt = new Date(appeal.resolvedAt);
      const diffHours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0);
    
    const avgAppealSlaHours = totalResolutionTime / appeals.length;
    
    // Calculate false positive rate (appeals where original moderation was overturned)
    const uphelAppeals = appeals.filter(appeal => 
      appeal.status === 'resolved' && 
      (appeal.reviewerDecision === 'restore' || appeal.reviewerDecision === 'reduce_penalty')
    ).length;
    
    const falsePositiveRate = appeals.length > 0 ? uphelAppeals / appeals.length : 0;
    
    timer.stopAndTrack({ metric_type: 'appeal_metrics' });
    context.info(`📊 Appeal metrics - SLA: ${avgAppealSlaHours.toFixed(2)}h, FPR: ${(falsePositiveRate * 100).toFixed(2)}%`);
    
    return {
      avgAppealSlaHours,
      falsePositiveRate,
      totalAppeals: appeals.length,
      uphelAppeals
    };
    
  } catch (error) {
    timer.stop();
    context.error('Error calculating appeal metrics:', error);
    return {
      avgAppealSlaHours: 0,
      falsePositiveRate: 0,
      totalAppeals: 0,
      uphelAppeals: 0
    };
  }
}

/**
 * Main KPI calculation function
 */
async function calculateKPIsInternal(myTimer: Timer, context: InvocationContext): Promise<void> {
  const timer = new PerformanceTimer('kpi_calculation', context);
  
  try {
    context.info('🎯 Starting daily KPI calculation...');
    
    // Calculate user activity metrics in parallel
    const [dau, wau, day1Retention, day7Retention] = await Promise.all([
      calculateDAU(context),
      calculateWAU(context),
      calculateDay1Retention(context),
      calculateDay7Retention(context)
    ]);
    
    // Calculate moderation metrics
    const moderationMetrics = await calculateAppealMetrics(context);
    
    // Emit all KPI metrics to Application Insights
    AsoraKPIs.trackDAUWAURatio(dau, wau, context);
    AsoraKPIs.trackRetention(day1Retention, day7Retention, context);
    AsoraKPIs.trackAppealSLA(moderationMetrics.avgAppealSlaHours, context);
    AsoraKPIs.trackFalsePositiveRate(
      moderationMetrics.falsePositiveRate,
      moderationMetrics.totalAppeals,
      moderationMetrics.uphelAppeals,
      context
    );
    
    // Track additional business metrics
    AsoraKPIs.trackBusinessMetric('daily_kpi_calculation', 1, {
      dau: dau.toString(),
      wau: wau.toString(),
      day1_retention_pct: (day1Retention * 100).toFixed(2),
      day7_retention_pct: (day7Retention * 100).toFixed(2),
      appeal_sla_hours: moderationMetrics.avgAppealSlaHours.toFixed(2),
      false_positive_rate_pct: (moderationMetrics.falsePositiveRate * 100).toFixed(2)
    }, context);
    
    const duration = timer.stopAndTrack({ metric_type: 'daily_kpi_calculation' });
    
    context.info(`✅ KPI calculation completed in ${duration}ms`);
    context.info(`📊 KPI Summary:`);
    context.info(`   • DAU: ${dau}`);
    context.info(`   • WAU: ${wau}`);
    context.info(`   • DAU/WAU Ratio: ${wau > 0 ? (dau / wau).toFixed(3) : '0'}`);
    context.info(`   • Day 1 Retention: ${(day1Retention * 100).toFixed(2)}%`);
    context.info(`   • Day 7 Retention: ${(day7Retention * 100).toFixed(2)}%`);
    context.info(`   • Appeal SLA: ${moderationMetrics.avgAppealSlaHours.toFixed(2)} hours`);
    context.info(`   • False Positive Rate: ${(moderationMetrics.falsePositiveRate * 100).toFixed(2)}%`);
    
    // Flush telemetry to ensure metrics are sent
    AsoraKPIs.flush();
    
  } catch (error) {
    timer.stop();
    context.error('❌ KPI calculation failed:', error);
    
    AsoraKPIs.trackBusinessMetric('kpi_calculation_errors', 1, {
      error_type: 'kpi_calculation_error'
    }, context);
  }
}

// Register timer function to run daily at 6 AM UTC
app.timer('calculateKPIs', {
  schedule: '0 0 6 * * *', // 6 AM UTC daily
  handler: calculateKPIsInternal
});
