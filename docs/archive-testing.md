# MBDF Room Archive System - Testing Guide

This document provides a comprehensive testing guide for the MBDF room archive/unarchive functionality.

## Prerequisites

1. **Database Migration**: Apply the archive migration first:
   ```sql
   -- Run sql/archive_migration.sql in your Supabase SQL editor
   ```

2. **Environment Setup**: Ensure Supabase and email services (Resend) are properly configured.

3. **User Roles**: Create test users with different roles:
   - Admin user
   - LR (Lead Registrant) user
   - Regular member user

## Test Scenarios

### 1. Archive Precheck Tests

#### Test 1.1: Access Control
- **Test**: Try accessing `/api/rooms/{roomId}/archive/check` with different user roles
- **Expected Results**:
  - ✅ Admin/LR: Should return 200 with precheck data
  - ❌ Member: Should return 403 Access Denied
  - ❌ Unauthenticated: Should return 401 Unauthorized

#### Test 1.2: Room Status Validation
- **Test**: Try precheck on already archived room
- **Expected Result**: Should return 409 Conflict with "Room is already archived" error

#### Test 1.3: Precheck Data Accuracy
- **Test**: Verify precheck data shows correct counts
- **Setup**: Create room with:
  - 2 pending access requests
  - 1 approved access request
  - 1 open LR vote
  - 3 members
- **Expected Result**: Precheck should show exact counts and correct effect predictions

### 2. Archive Operation Tests

#### Test 2.1: Archive with Valid Input
- **Test**: Archive a room with valid reason
- **Steps**:
  1. POST to `/api/rooms/{roomId}/archive/confirm` with `{ "reason": "Test archive reason" }`
  2. Check response data
  3. Verify database changes
- **Expected Results**:
  - ✅ Response: Success with summary counts
  - ✅ Database: Room status = 'archived', archived_at set, reason saved
  - ✅ Database: Pending requests → rejected
  - ✅ Database: Approved requests → revoked, tokens nullified
  - ✅ Audit log entry created

#### Test 2.2: Archive without Reason
- **Test**: Archive a room without providing reason
- **Expected Result**: Should succeed with null reason

#### Test 2.3: Archive with Short Reason
- **Test**: Provide reason shorter than 10 characters
- **Expected Result**: Should return 400 validation error

#### Test 2.4: Double Archive Attempt
- **Test**: Try to archive already archived room
- **Expected Result**: Should return error from database function

### 3. RLS Policy Tests

#### Test 3.1: Write Operations on Archived Room
- **Test**: Try to INSERT/UPDATE/DELETE on archived room for each table:
  - Documents
  - Messages
  - LR candidates
  - LR votes
- **Expected Result**: All write operations should be blocked by RLS policies

#### Test 3.2: Read Operations on Archived Room
- **Test**: Try to SELECT from archived room tables
- **Expected Result**: Read operations should still work normally

### 4. Unarchive Operation Tests

#### Test 4.1: Admin Unarchive
- **Test**: Admin user unarchives a room
- **Expected Results**:
  - ✅ Response: Success with unarchive data
  - ✅ Database: Room status = 'active', archive fields cleared
  - ✅ Write operations work again
  - ❌ Revoked tokens remain revoked (by design)

#### Test 4.2: Non-Admin Unarchive Attempt
- **Test**: LR or member tries to unarchive
- **Expected Result**: Should return 403 Access Denied

### 5. Email Notification Tests

#### Test 5.1: Archive Notification
- **Test**: Archive a room with members
- **Expected Results**:
  - ✅ All room members receive "Room Archived" email
  - ✅ Email contains correct room name, reason, date
  - ✅ Email shows affected request counts

#### Test 5.2: Unarchive Notification
- **Test**: Unarchive a room with members
- **Expected Results**:
  - ✅ All room members receive "Room Unarchived" email
  - ✅ Email contains correct room name and reactivation date

### 6. UI/UX Tests

#### Test 6.1: Archive Dialog Flow
- **Test**: Complete archive dialog workflow
- **Steps**:
  1. Open room settings menu
  2. Click "Archive Room"
  3. Review precheck information
  4. Enter reason and confirmation text
  5. Submit archive
- **Expected Results**:
  - ✅ Dialog shows accurate precheck data
  - ✅ Confirmation requires exact text "ARCHIVE"
  - ✅ Success toast appears
  - ✅ Room UI updates to show archived state

#### Test 6.2: Archived Room UI State
- **Test**: Verify UI correctly reflects archived state
- **Expected Results**:
  - ✅ Orange archived banner appears
  - ✅ Status badge shows "Arşivlenmiş" with destructive variant
  - ✅ All write action buttons are disabled
  - ✅ Dropdown menu items are disabled

#### Test 6.3: Unarchive Button (Admin Only)
- **Test**: Test unarchive functionality in UI
- **Expected Results**:
  - ✅ Admin sees "Reactivate Room" button in archived banner
  - ❌ Non-admin users don't see the button
  - ✅ Button works and updates UI immediately

### 7. Performance Tests

#### Test 7.1: Large Room Archive
- **Test**: Archive a room with many members and requests
- **Setup**: Create room with 100+ members, 50+ access requests
- **Expected Result**: Operation completes within reasonable time (< 5 seconds)

#### Test 7.2: Email Batch Processing
- **Test**: Verify email sending doesn't block API response
- **Expected Result**: API returns success immediately, emails sent asynchronously

### 8. Error Handling Tests

#### Test 8.1: Database Connection Issues
- **Test**: Simulate database connectivity issues
- **Expected Result**: Appropriate error messages, no partial state changes

#### Test 8.2: Email Service Failures
- **Test**: Simulate email service failures
- **Expected Results**:
  - ✅ Archive/unarchive operations still succeed
  - ✅ Errors logged but don't affect main operation
  - ✅ User receives success message for archive operation

### 9. Integration Tests

#### Test 9.1: End-to-End Archive Flow
- **Test**: Complete archive workflow from UI to database
- **Steps**:
  1. Create room with test data
  2. Archive via UI
  3. Verify all system effects
  4. Unarchive as admin
  5. Verify restoration
- **Expected Result**: All steps work seamlessly

#### Test 9.2: Multi-User Concurrent Operations
- **Test**: Multiple users interacting with archived room simultaneously
- **Expected Result**: No race conditions, consistent state maintained

## Manual Testing Checklist

### Setup Phase
- [ ] Database migration applied successfully
- [ ] Test users created with different roles
- [ ] Test rooms created with sample data
- [ ] Email service configured and tested

### Archive Functionality
- [ ] Archive precheck shows correct data
- [ ] Archive operation works with valid input
- [ ] Archive operation rejects invalid input
- [ ] RLS policies block writes to archived rooms
- [ ] RLS policies allow reads from archived rooms
- [ ] Audit logs created correctly
- [ ] Email notifications sent successfully

### Unarchive Functionality
- [ ] Only admins can unarchive rooms
- [ ] Unarchive operation restores room to active state
- [ ] Revoked tokens remain revoked after unarchive
- [ ] Write operations work after unarchive
- [ ] Email notifications sent for unarchive

### UI/UX Validation
- [ ] Archive dialog shows accurate precheck data
- [ ] Archive dialog requires proper confirmation
- [ ] Archived rooms display correctly with banner
- [ ] All write actions properly disabled in archived rooms
- [ ] Unarchive button only visible to admins
- [ ] Status badges and colors correct for all states

### Error Cases
- [ ] Proper error handling for all API endpoints
- [ ] User-friendly error messages in UI
- [ ] No data corruption on errors
- [ ] Email failures don't break archive operations

## Success Criteria

The archive system is considered fully functional when:

1. ✅ All API endpoints work correctly with proper authentication
2. ✅ Database changes are atomic and consistent
3. ✅ RLS policies properly enforce read-only mode
4. ✅ Email notifications are sent reliably
5. ✅ UI correctly reflects all archive states
6. ✅ Error handling is robust and user-friendly
7. ✅ Performance is acceptable for expected load
8. ✅ All security requirements are met

## Rollback Plan

If issues are discovered:

1. **Immediate**: Disable archive functionality via feature flag (if implemented)
2. **Database**: Revert RLS policies that might block legitimate operations
3. **UI**: Hide archive buttons via CSS or component flags
4. **Recovery**: Unarchive affected rooms via direct SQL if needed

## Production Deployment Notes

1. **Migration Order**: Apply database migration during low-traffic period
2. **Feature Rollout**: Consider gradual rollout to admin users first
3. **Monitoring**: Watch for email failures and database performance
4. **Documentation**: Update user documentation with archive procedures