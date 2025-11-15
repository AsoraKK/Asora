@description('ResourceId of the Application Insights component (appi-asora-dev)')
param appInsightsId string

@description('One or more action groups that should be notified when feed alerts fire')
param actionGroupIds array

resource feedLatencyAlert 'Microsoft.Insights/scheduledQueryRules@2018-04-16' = {
  name: 'feed-p95-latency'
  location: 'global'
  properties: {
    description: 'Alert when feed p95 latency exceeds 200 ms for 15 minutes'
    enabled: true
    source: {
      query: '''
      requests
      | where url has "/api/feed"
      | summarize p95=percentile(duration,95) by bin(timestamp, 5m)
      '''
      dataSourceId: appInsightsId
      queryType: 'ResultCount'
    }
    schedule: {
      timeWindowInMinutes: 15
      frequencyInMinutes: 5
    }
    action: {
      odata.type: 'Microsoft.Azure.Management.Insights.Models.RuleEmailAction'
      sendToServiceOwners: false
      customEmails: []
      actionGroups: [
        for id in actionGroupIds: {
          actionGroupId: id
        }
      ]
    }
    criteria: {
      allOf: [
        {
          queryTimeAggregation: 'Average'
          metricMeasureColumn: 'p95'
          operator: 'GreaterThan'
          threshold: 200
        }
      ]
    }
    severity: 2
    autoMitigate: true
  }
}

resource feedErrorAlert 'Microsoft.Insights/scheduledQueryRules@2018-04-16' = {
  name: 'feed-error-rate'
  location: 'global'
  properties: {
    description: 'Alert when feed error rate exceeds 1% for 15 minutes'
    enabled: true
    source: {
      query: '''
      requests
      | where url has "/api/feed"
      | summarize err_rate=100.0 * countif(success == false) / count() by bin(timestamp, 5m)
      '''
      dataSourceId: appInsightsId
      queryType: 'ResultCount'
    }
    schedule: {
      timeWindowInMinutes: 15
      frequencyInMinutes: 5
    }
    action: {
      odata.type: 'Microsoft.Azure.Management.Insights.Models.RuleEmailAction'
      sendToServiceOwners: false
      customEmails: []
      actionGroups: [
        for id in actionGroupIds: {
          actionGroupId: id
        }
      ]
    }
    criteria: {
      allOf: [
        {
          queryTimeAggregation: 'Average'
          metricMeasureColumn: 'err_rate'
          operator: 'GreaterThan'
          threshold: 1
        }
      ]
    }
    severity: 3
    autoMitigate: true
  }
}
