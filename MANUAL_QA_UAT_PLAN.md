# 📋 **Manual QA & User Acceptance Test Plan**
## **Asora Flutter App - Comprehensive Testing Checklist**

---

## **🎯 Test Overview**

### **Testing Scope**
- **Primary Features:** Authentication, Feed Browsing, Voting System, Moderation, Appeals
- **Platforms:** Android Emulator, iOS Simulator
- **Test Types:** Functional, UI/UX, Error Handling, Edge Cases
- **Duration:** Estimated 4-6 hours for complete test suite

### **Test Environment**
- ✅ **Android:** API Level 29+ (Android 10+)
- ✅ **iOS:** iOS 13+ Simulator
- ✅ **Network:** WiFi, 4G/5G simulation
- ✅ **Screen Sizes:** Phone (5.5"), Tablet (10.1")

---

## **🔐 Authentication Flow Tests**

### **✅ User Story 1: User Login/Authentication**
**Route:** `/login` → `LoginScreen`

#### **Test Case 1.1: Successful Login**
**Steps:**
1. Launch app → Navigate to Login Screen
2. Enter valid email: `test@asora.com`
3. Enter password (currently uses default password)
4. Tap "Login" button
5. Observe loading state with spinner
6. Wait for success response

**Expected Results:**
- ✅ Loading spinner appears on button
- ✅ Success SnackBar: "Welcome test@asora.com!"
- ✅ User dialog displays with user details
- ✅ JWT token stored securely
- ✅ Navigation to main app flow

**Test Data:**
```dart
Email: test@asora.com
Password: defaultPassword
Expected User Object: {email, role, tier, reputationScore}
```

#### **Test Case 1.2: Authentication Error Handling**
**Steps:**
1. Enter invalid email: `invalid@test.com`
2. Tap "Login" button
3. Observe error handling

**Expected Results:**
- ❌ Error SnackBar with AuthFailure message
- ❌ No navigation occurs
- ❌ Login form remains accessible

#### **Test Case 1.3: Network Error Simulation**
**Steps:**
1. Disable device network connection
2. Attempt login with valid credentials
3. Observe network error handling

**Expected Results:**
- ❌ Network error displayed in SnackBar
- ❌ Graceful error recovery
- ❌ Retry option available

#### **Test Case 1.4: User Logout**
**Steps:**
1. From logged-in state, tap "Logout (for testing)" button
2. Observe logout behavior

**Expected Results:**
- ✅ Success SnackBar: "Logged out"
- ✅ All authentication data cleared
- ✅ User returned to login state

---

## **🗳️ Community Voting & Feed Tests**

### **✅ User Story 2: Browse Community Voting Feed**
**Route:** `/vote-feed` → `VoteFeedPage`

#### **Test Case 2.1: Load Voting Feed**
**Steps:**
1. Navigate to Community Voting page
2. Observe initial load state
3. Wait for appeals to load
4. Verify appeal cards display correctly

**Expected Results:**
- ✅ Loading indicator: "Loading appeals for community review..."
- ✅ Appeal cards load with proper data
- ✅ Each card shows: urgency badge, content preview, voting buttons
- ✅ Real-time vote counts display

#### **Test Case 2.2: Search Appeals**
**Steps:**
1. Tap search bar at top of vote feed
2. Enter search term: "harassment"
3. Verify filtered results
4. Clear search with X button

**Expected Results:**
- ✅ Search filters appeals by content/reason
- ✅ Results update in real-time
- ✅ Clear button removes search filter
- ✅ "No results" state if no matches

#### **Test Case 2.3: Filter by Status**
**Steps:**
1. Tap "Status" filter chip
2. Select "Active Voting"
3. Verify only active appeals shown
4. Test other status filters: "Quorum Reached", "Time Expired"

**Expected Results:**
- ✅ Filter dialog opens with options
- ✅ Appeals filtered correctly by status
- ✅ Filter chip shows selected state
- ✅ "Clear All" removes all filters

#### **Test Case 2.4: Filter by Content Type**
**Steps:**
1. Tap "Content" filter chip
2. Select "Posts"
3. Verify only post appeals shown
4. Test filters: "Comments", "Users"

**Expected Results:**
- ✅ Content type filtering works correctly
- ✅ Visual indicators show content type
- ✅ Multiple filters can be combined

#### **Test Case 2.5: Sort Options**
**Steps:**
1. Tap sort icon in app bar
2. Test each sort option:
   - "Newest First"
   - "Oldest First"
   - "Most Urgent"
   - "Most Voted"

**Expected Results:**
- ✅ Appeals reorder based on selection
- ✅ Sort preference maintained during session
- ✅ Visual feedback for sort order

---

## **👍 Voting System Tests**

### **✅ User Story 3: Submit Votes on Appeals**
**Component:** `AppealVotingCard`

#### **Test Case 3.1: Approve Vote Submission**
**Steps:**
1. Find an appeal user can vote on
2. Read appeal details and content preview
3. Tap "Approve" button (green)
4. Observe vote submission flow

**Expected Results:**
- ✅ Button shows loading spinner during submission
- ✅ Success SnackBar: "Vote submitted successfully!"
- ✅ Button state changes to "You voted to approve"
- ✅ Vote count updates in real-time
- ✅ Progress bar updates with new approval percentage

#### **Test Case 3.2: Reject Vote Submission**
**Steps:**
1. Find different appeal user can vote on
2. Tap "Reject" button (red)
3. Observe vote submission and UI updates

**Expected Results:**
- ✅ Similar flow to approve but with reject styling
- ✅ Red color scheme for rejected state
- ✅ Proper vote count updates

#### **Test Case 3.3: Vote Error Handling**
**Steps:**
1. Attempt to vote while network is disabled
2. Try voting on appeal user already voted on
3. Try voting without authentication

**Expected Results:**
- ❌ Network error: "Failed to submit vote: NetworkError"
- ❌ Duplicate vote: "You have already voted on this appeal"
- ❌ Auth error: "Please log in to vote"
- ❌ Optimistic UI reverts on error

#### **Test Case 3.4: Voting Eligibility**
**Steps:**
1. Find appeal where user cannot vote
2. Verify ineligible state display
3. Check eligibility reasons

**Expected Results:**
- ⛔ Gray "You cannot vote on this appeal" message
- ⛔ Block icon displayed
- ⛔ Voting buttons disabled/hidden
- ⛔ Reason displayed if available

#### **Test Case 3.5: Voting Progress Display**
**Steps:**
1. Examine appeals with active voting
2. Verify progress indicators
3. Check vote breakdown display

**Expected Results:**
- ✅ Linear progress bar shows approval percentage
- ✅ "X approve (Y%)" and "Z reject" counts
- ✅ "Quorum reached" badge when applicable
- ✅ Time remaining display when available

---

## **🚩 Moderation & Appeals Tests**

### **✅ User Story 4: Content Moderation Actions**
**Route:** `/moderation-demo` → `ModerationDemoPage`

#### **Test Case 4.1: Flag Content**
**Steps:**
1. Navigate to Moderation Demo page
2. Find any post with "Report" button
3. Tap "Report" button
4. Fill out flag dialog:
   - Reason: "Harassment"
   - Additional details: "Targeted harassment of user"
5. Submit flag

**Expected Results:**
- ✅ Flag dialog opens with form fields
- ✅ Reason dropdown with predefined options
- ✅ Additional details text area
- ✅ Success confirmation after submission
- ✅ Post shows moderation badge after flagging

#### **Test Case 4.2: View Moderation Status**
**Steps:**
1. Toggle "AI Scores" switch in demo page
2. Observe AI confidence ratings
3. Check moderation badges on posts

**Expected Results:**
- ✅ AI scores display as percentages
- ✅ Moderation status badges show clearly
- ✅ Different post states: Clean, Flagged, Hidden, Appealed
- ✅ Color coding for different statuses

#### **Test Case 4.3: Appeal Flagged Content**
**Steps:**
1. Find post marked as "Hidden by moderators"
2. Tap "Appeal" badge on your own post
3. Fill out appeal form:
   - Appeal Type: "False Positive"
   - Reason: "Content was misclassified"
   - Statement: "This post does not violate community guidelines..."
4. Submit appeal

**Expected Results:**
- ✅ Appeal dialog opens with form fields
- ✅ Appeal type dropdown selection
- ✅ Character counter for statement (if implemented)
- ✅ Success confirmation after submission
- ✅ Post shows "Under Appeal" status

---

## **📊 Appeal History & Tracking Tests**

### **✅ User Story 5: Track Personal Appeals**
**Route:** `/appeal-history` → `AppealHistoryScreen`

#### **Test Case 5.1: View All Appeals**
**Steps:**
1. Navigate to Appeal History page
2. Verify "All" tab displays all user appeals
3. Check appeal cards show proper information

**Expected Results:**
- ✅ All user-submitted appeals display
- ✅ Status badges: Active, Quorum Reached, Resolved
- ✅ Content type icons: Post, Comment, User
- ✅ Urgency level indicators
- ✅ Submission date formatting

#### **Test Case 5.2: Active Appeals Tab**
**Steps:**
1. Tap "Active" tab
2. Verify only active appeals show
3. Check voting progress indicators

**Expected Results:**
- ✅ Only appeals with "Active Voting" status
- ✅ Real-time voting progress bars
- ✅ Vote counts and percentages
- ✅ Time remaining displays

#### **Test Case 5.3: Analytics Dashboard**
**Steps:**
1. Tap "Analytics" tab
2. Review overview cards
3. Check breakdown charts

**Expected Results:**
- ✅ Total appeals count
- ✅ Active appeals count
- ✅ Resolution rate percentage
- ✅ Content type breakdown
- ✅ Status distribution chart

#### **Test Case 5.4: Appeal Details View**
**Steps:**
1. Tap "View Details" on any appeal
2. Examine detailed information
3. Verify all data displays correctly

**Expected Results:**
- ✅ Full appeal information popup
- ✅ Original content preview
- ✅ Appeal reason and statement
- ✅ Voting progress details
- ✅ Timeline information

---

## **⚠️ Error Handling & Edge Cases**

### **✅ User Story 6: Graceful Error Handling**

#### **Test Case 6.1: Network Connectivity Issues**
**Steps:**
1. Start with working network connection
2. Disable WiFi/mobile data during app usage
3. Attempt various actions (login, voting, loading feeds)
4. Re-enable network and test recovery

**Expected Results:**
- ❌ Clear error messages: "Network error occurred"
- ❌ No app crashes or freezes
- ❌ Retry buttons available where appropriate
- ✅ Automatic recovery when network restored

#### **Test Case 6.2: Empty State Handling**
**Steps:**
1. Navigate to Vote Feed with no appeals
2. Check Appeal History with no appeals
3. Search for non-existent content

**Expected Results:**
- 📭 "No appeals for voting" empty state
- 📭 "No appeals submitted yet" in history
- 📭 "No appeals match your filters" for search
- 📭 Appropriate empty state illustrations

#### **Test Case 6.3: Authentication Expiry**
**Steps:**
1. Login with valid credentials
2. Wait for JWT token expiry (or simulate)
3. Attempt protected actions

**Expected Results:**
- ❌ "Please log in to continue" messages
- ❌ Redirect to login screen
- ❌ Secure data clearing

#### **Test Case 6.4: Malformed Data Handling**
**Steps:**
1. Simulate server returning malformed data
2. Test with missing required fields
3. Check JSON parsing errors

**Expected Results:**
- ❌ Graceful error handling
- ❌ No app crashes
- ❌ User-friendly error messages

---

## **📱 Platform-Specific UI Tests**

### **✅ User Story 7: Responsive UI Design**

#### **Test Case 7.1: Android Material 3 Design**
**Platform:** Android Emulator
**Steps:**
1. Test all screens on Android
2. Verify Material 3 components
3. Check dark/light theme support

**Expected Results:**
- ✅ Material 3 color scheme applied
- ✅ Proper elevation and shadows
- ✅ Android-specific navigation patterns
- ✅ Theme switching works correctly

#### **Test Case 7.2: iOS Cupertino Design Compliance**
**Platform:** iOS Simulator
**Steps:**
1. Test all screens on iOS
2. Verify iOS-specific UI elements
3. Check navigation bar styling

**Expected Results:**
- ✅ iOS-appropriate styling applied
- ✅ Proper navigation bar treatment
- ✅ iOS gesture navigation support
- ✅ System theme compliance

#### **Test Case 7.3: Screen Size Responsiveness**
**Steps:**
1. Test on small phone (5.5")
2. Test on large phone (6.7")
3. Test on tablet (10.1")

**Expected Results:**
- ✅ Content scales appropriately
- ✅ No horizontal scrolling on mobile
- ✅ Touch targets meet accessibility standards
- ✅ Text remains readable at all sizes

#### **Test Case 7.4: Orientation Changes**
**Steps:**
1. Test portrait orientation
2. Rotate to landscape
3. Verify layout adaptation

**Expected Results:**
- ✅ Layout adapts to landscape
- ✅ No content cutoff
- ✅ Proper keyboard handling
- ✅ State preservation during rotation

---

## **🔄 User Journey Integration Tests**

### **✅ User Story 8: Complete Moderation Workflow**

#### **Test Case 8.1: End-to-End Moderation Flow**
**Steps:**
1. **Setup**: Login as User A
2. **Action**: Flag a post for harassment
3. **Switch**: Login as User B (community member)
4. **Review**: Navigate to Vote Feed
5. **Decision**: Vote to approve/reject the appeal
6. **Switch**: Return to User A
7. **Track**: Check Appeal History for outcome

**Expected Results:**
- ✅ Each step completes successfully
- ✅ Data consistency across user sessions
- ✅ Real-time updates reflect between users
- ✅ Proper status transitions throughout flow

#### **Test Case 8.2: Multi-Device Consistency**
**Steps:**
1. Login on Android device
2. Perform actions (vote, submit appeal)
3. Login on iOS device with same account
4. Verify data consistency

**Expected Results:**
- ✅ All data synced across devices
- ✅ Vote history consistent
- ✅ Appeal status matches
- ✅ No data loss or duplication

---

## **📊 Performance & Load Tests**

### **✅ User Story 9: App Performance**

#### **Test Case 9.1: Initial Load Performance**
**Steps:**
1. Fresh app install
2. Time app startup
3. Measure initial screen render

**Expected Results:**
- ✅ App launches < 3 seconds
- ✅ No ANR (Application Not Responding)
- ✅ Smooth animations and transitions

#### **Test Case 9.2: Memory Usage**
**Steps:**
1. Navigate through all screens
2. Load large lists (100+ appeals)
3. Check memory consumption

**Expected Results:**
- ✅ Memory usage remains stable
- ✅ No memory leaks detected
- ✅ Smooth scrolling performance

#### **Test Case 9.3: Network Efficiency**
**Steps:**
1. Monitor network requests
2. Check data usage patterns
3. Verify caching behavior

**Expected Results:**
- ✅ Efficient API calls
- ✅ Appropriate caching strategies
- ✅ Minimal redundant requests

---

## **✅ Test Results Tracking**

### **Test Execution Checklist**

#### **🔐 Authentication Tests**
- [ ] Test Case 1.1: Successful Login
- [ ] Test Case 1.2: Authentication Error Handling
- [ ] Test Case 1.3: Network Error Simulation
- [ ] Test Case 1.4: User Logout

#### **🗳️ Voting & Feed Tests**
- [ ] Test Case 2.1: Load Voting Feed
- [ ] Test Case 2.2: Search Appeals
- [ ] Test Case 2.3: Filter by Status
- [ ] Test Case 2.4: Filter by Content Type
- [ ] Test Case 2.5: Sort Options

#### **👍 Voting System Tests**
- [ ] Test Case 3.1: Approve Vote Submission
- [ ] Test Case 3.2: Reject Vote Submission
- [ ] Test Case 3.3: Vote Error Handling
- [ ] Test Case 3.4: Voting Eligibility
- [ ] Test Case 3.5: Voting Progress Display

#### **🚩 Moderation Tests**
- [ ] Test Case 4.1: Flag Content
- [ ] Test Case 4.2: View Moderation Status
- [ ] Test Case 4.3: Appeal Flagged Content

#### **📊 Appeal History Tests**
- [ ] Test Case 5.1: View All Appeals
- [ ] Test Case 5.2: Active Appeals Tab
- [ ] Test Case 5.3: Analytics Dashboard
- [ ] Test Case 5.4: Appeal Details View

#### **⚠️ Error Handling Tests**
- [ ] Test Case 6.1: Network Connectivity Issues
- [ ] Test Case 6.2: Empty State Handling
- [ ] Test Case 6.3: Authentication Expiry
- [ ] Test Case 6.4: Malformed Data Handling

#### **📱 Platform UI Tests**
- [ ] Test Case 7.1: Android Material 3 Design
- [ ] Test Case 7.2: iOS Cupertino Design Compliance
- [ ] Test Case 7.3: Screen Size Responsiveness
- [ ] Test Case 7.4: Orientation Changes

#### **🔄 Integration Tests**
- [ ] Test Case 8.1: End-to-End Moderation Flow
- [ ] Test Case 8.2: Multi-Device Consistency

#### **📊 Performance Tests**
- [ ] Test Case 9.1: Initial Load Performance
- [ ] Test Case 9.2: Memory Usage
- [ ] Test Case 9.3: Network Efficiency

---

## **🐛 Bug Reporting Template**

### **Issue Report Format**
```markdown
**Bug ID:** UAT-XXX
**Severity:** High/Medium/Low
**Priority:** P1/P2/P3

**Test Case:** [Reference test case number]
**Environment:** Android/iOS [Version]
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Videos:**
[Attach visual evidence]

**Device Information:**
- OS Version: 
- App Version:
- Screen Size:
- Network: WiFi/4G/5G

**Additional Notes:**
[Any other relevant information]
```

---

## **📋 Test Completion Criteria**

### **✅ Exit Criteria**
- [ ] All critical test cases pass (100%)
- [ ] High priority test cases pass (95%+)
- [ ] Medium priority test cases pass (90%+)
- [ ] No blocking issues remain
- [ ] Performance benchmarks met
- [ ] Cross-platform consistency verified
- [ ] Error handling validated
- [ ] User experience flows complete

### **📊 Test Metrics**
- **Total Test Cases:** 39
- **Critical Path Cases:** 15
- **Platform-Specific Cases:** 8
- **Error Handling Cases:** 4
- **Performance Cases:** 3
- **Integration Cases:** 9

### **🎯 Success Criteria**
✅ **Primary User Flows:** All authentication, voting, moderation flows work end-to-end
✅ **Error Resilience:** App handles all error scenarios gracefully
✅ **Cross-Platform:** Consistent experience on Android and iOS
✅ **Performance:** App meets responsiveness benchmarks
✅ **User Experience:** Intuitive navigation and clear feedback

**Estimated Total Test Time:** 4-6 hours for complete execution
**Recommended Test Frequency:** Before each release + regression testing

---

*This comprehensive test plan ensures the Asora Flutter app delivers a robust, user-friendly community moderation experience across all supported platforms.* 🚀
