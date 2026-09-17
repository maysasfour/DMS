# Disaster Management App - User Guide & Testing Manual

## 🎯 Quick Start

### First-Time Setup
1. Launch the app
2. See animated splash screen with "Respond faster. Stay safer." tagline
3. Navigate to Login screen
4. Sign up with a test account or use demo credentials
5. Dashboard displays with bottom navigation

## 📊 Role-Based Workflows

### 👨‍💼 Administrator Dashboard
**Accent Color**: Deep Blue (#1E3A8A)
**Icon**: Admin Panel Settings

**Available Features**:
1. View all incidents in real-time
2. Manage all users in the system
3. Access system analytics and reports
4. Configure system settings
5. View response statistics
6. Monitor responder performance

**Workflow**:
1. Login as Admin
2. Bottom navigation shows Dashboard tab (blue)
3. Tap "Admin Tools" in profile for:
   - User Management
   - Analytics View
   - System Settings

### 🚨 Responder Interface
**Accent Color**: Orange (#EA580C)
**Icon**: Emergency Shield

**Available Features**:
1. View incidents assigned to them
2. Track response history
3. Update personal availability status
4. View performance metrics
5. Report incident updates

**Workflow**:
1. Login as Responder
2. Dashboard shows emergency response focus
3. Tap "Responder Info" in profile to see:
   - Response History
   - Performance Metrics
   - Availability Status

### 👤 Citizen Portal
**Accent Color**: Green (#16A34A)
**Icon**: Person

**Available Features**:
1. Report new incidents with photos/videos
2. Track their own reports
3. Manage emergency contacts
4. Receive alerts on personal reports
5. Update profile information

**Workflow**:
1. Login as Citizen
2. Tap "Report Incident" or "+" button
3. Fill incident form:
   - Title: "Building on fire"
   - Description: Detailed info
   - Location: Street address
   - Affected People: Number estimate
   - Severity: Select level
   - Add Photos: Tap camera icon
   - Add Video: Tap video icon
4. Submit to create incident

### 🏛️ Official Oversight
**Accent Color**: Purple (#7C3AED)
**Icon**: Badge

**Available Features**:
1. View comprehensive statistics
2. Monitor all incidents
3. Generate compliance reports
4. Track system usage
5. Access incident trends

**Workflow**:
1. Login as Official
2. Dashboard prioritizes statistics
3. Tap "Official Dashboard" in profile to see:
   - Statistics Overview
   - Incident Oversight
   - Compliance Reports

## 🧭 Navigation Guide

### Bottom Navigation Bar (5 Tabs)

#### Tab 1: Dashboard 📊
- Home view with quick stats
- Welcome message with user role
- Recent incidents summary
- Quick action buttons

#### Tab 2: Incidents 📋
- List of all incidents
- Filter by status:
  - Reported (blue)
  - Acknowledged (purple)
  - In Progress (orange)
  - Resolved (green)
  - Closed (gray)
- Sort options:
  - Recent first
  - Oldest first
- Click any incident to see details
- Edit button to modify incident
- Delete button to remove incident

#### Tab 3: Map 🗺️
- Visual map view
- Incident markers at coordinates
- Tap marker for incident info
- Shows incident density and hotspots
- Easy navigation to incident details

#### Tab 4: Alerts 🔔
- All notifications and alerts
- Color-coded by type:
  - 🔴 Emergency (red)
  - 🟡 Warning (yellow/orange)
  - 🟢 Information (green)
- Sort by time
- Tap to navigate to related incident

#### Tab 5: Profile 👤
- User profile information
- Edit profile button
- Role-based action tiles
- Logout option

### Drawer Menu (Swipe left or tap ☰)
- Settings ⚙️
- Resources 📚
- Reports 📊
- About 📖
- Logout 🚪

## 📋 Step-by-Step Workflows

### Reporting a New Incident

1. **From Dashboard**:
   - Tap "+" floating button (if visible)
   - Or go to Incidents tab → Report Incident

2. **Complete the Form**:
   ```
   Title: "Fire at Community Center"
   Description: "Large fire on building roof, evacuating residents"
   Location: "123 Main Street, Downtown"
   Affected People: "45"
   Severity: Select "Critical" (red)
   ```

3. **Add Media**:
   - Tap "Add Photos" → Select multiple images
   - Tap "Add Video" → Select video file
   - Media appears in preview grid
   - X button removes any media

4. **Submit**:
   - Tap "Submit Report"
   - See success confirmation
   - Incident appears in list

### Responding to an Incident

1. **Find Incident**:
   - Incidents tab → See list of reports
   - Filter by "reported" status
   - Find your assigned incident

2. **View Details**:
   - Tap incident card
   - See full details, photos, videos
   - View severity and location
   - See who reported it

3. **Update Incident**:
   - Tap "Edit" button
   - Change status to "In Progress"
   - Add response notes
   - Save changes

4. **Mark Complete**:
   - Tap Edit again
   - Change status to "Resolved"
   - Add completion notes
   - Save incident

### Accessing Reports and Analytics

1. **From Drawer**:
   - Tap menu icon (☰)
   - Select "Reports"
   - Or tap "Official Dashboard" in profile

2. **View Analytics**:
   - Total incidents by status
   - Severity distribution
   - Response times
   - Team performance
   - Trends over time

3. **Export/Share**:
   - Reports can be generated
   - Share with stakeholders
   - Print or email

## ⚙️ Settings Guide

### Appearance Settings

**Language**:
- Tap Settings → Language
- Choose English or العربية (Arabic)
- UI updates immediately
- All text translates instantly

**Theme**:
- Tap Settings → Theme toggle
- Switch between Light and Dark modes
- Applied immediately to all screens
- Text legibility maintained

### Notification Settings

**Push Notifications**:
- Enable/disable alerts
- Choose alert types
- Set quiet hours

**Sound & Vibration**:
- Enable/disable sounds
- Vibration on/off
- Sound preferences

### Account & Security

**Profile**:
- Edit name
- Update email
- Change phone
- Add bio

**Logout**:
- Tap "Logout"
- Confirm logout
- Clears all local data
- Returns to login screen

## 🎨 Understanding the Color System

### Status Colors
- 🔵 **Reported** (Blue): Initial report received
- 🟣 **Acknowledged** (Purple): Responder is aware
- 🟠 **In Progress** (Orange): Being addressed
- 🟢 **Resolved** (Green): Issue resolved
- ⚪ **Closed** (Gray): Officially closed

### Severity Colors
- 🟢 **Low** (Green): Minor incident
- 🔵 **Medium** (Blue): Moderate impact
- 🟠 **High** (Orange): Significant impact
- 🔴 **Critical** (Red): Life-threatening

### Role Colors
- 🔵 **Admin** (Deep Blue): System administrators
- 🟠 **Responder** (Orange): Emergency responders
- 🟢 **Citizen** (Green): Public users
- 🟣 **Official** (Purple): Government officials

## 📱 Mobile Responsiveness

The app adapts to different screen sizes:
- **Large Tablets**: Full-width cards with side panels
- **Standard Phones**: Full-width optimized layouts
- **Small Phones**: Compact cards with stack layout
- **Landscape**: Optimized sidebar navigation

All buttons are touchable (minimum 56px height).

## 🔍 Search & Filter Guide

### Incident Filtering
1. Open Incidents tab
2. Tap filter dropdown (top of list)
3. Select status:
   - All incidents
   - Reported
   - Acknowledged
   - In Progress
   - Resolved
   - Closed

### Sorting Options
1. Tap sort dropdown (next to filter)
2. Choose:
   - Recent first (newest incidents first)
   - Oldest first (oldest incidents first)

### Map View
- Tap on any marker to see incident
- Zoom in/out to explore area
- Color of marker indicates status

## ⌨️ Keyboard Shortcuts (Desktop)

- `Escape`: Close dialogs
- `Tab`: Navigate between fields
- `Enter`: Submit forms
- `Ctrl+L`: Open logout
- `Ctrl+S`: Save changes

## 🐛 Troubleshooting

### App Won't Start
- Force restart the app
- Clear app cache (Settings → Apps → DMS → Clear Cache)
- Reinstall app

### Data Not Updating
- Pull to refresh (swipe down)
- Check internet connection
- Log out and back in

### Media Not Uploading
- Check file size (< 50MB recommended)
- Ensure sufficient storage
- Check permission settings

### Language Not Changing
- Close app completely
- Reopen app
- Language should update

### Dark Mode Issues
- Toggle theme twice
- Restart app
- Clear app cache

## 📞 Support & Help

### In-App Help
- Tap Help icon (?)
- View FAQs
- Contact support
- Report bug

### Common Issues

**Q: Can't attach media?**
A: Check gallery permissions. Settings → Apps → DMS → Permissions → Gallery

**Q: Reports not saving?**
A: Ensure all required fields are filled (marked with *)

**Q: Role not changing?**
A: Log out completely and log back in with different account

**Q: Notifications not working?**
A: Enable in Settings and check system notification permissions

## 🎓 Best Practices

### For All Users
1. Keep profile information up to date
2. Use descriptive incident titles
3. Add relevant photos/videos
4. Update incident status as situation changes
5. Review reports regularly

### For Responders
1. Acknowledge incidents promptly
2. Update status to "In Progress" when starting
3. Mark "Resolved" when complete
4. Document response actions
5. Check personal availability status

### For Administrators
1. Review system analytics regularly
2. Monitor responder performance
3. Update system settings as needed
4. Generate periodic reports
5. Maintain user accounts

### For Citizens
1. Report incidents accurately
2. Provide location details
3. Add supporting media
4. Monitor report status
5. Update information if situation changes

## 📊 Performance Tips

- Close unused tabs to save battery
- Disable notifications if not needed
- Use light mode in daylight (battery saving)
- Limit number of media attachments
- Archive old incidents regularly

---

**App Version**: 1.0.0
**Last Updated**: 2024
**Status**: Ready for production use
