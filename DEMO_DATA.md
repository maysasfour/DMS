# Demo Data & Credentials Reference

## 👥 User Accounts

### All Demo Credentials

| # | Role | Email | Password | Use Case |
|---|------|-------|----------|----------|
| 1 | 👨‍💼 Admin | `admin@dm.com` | `Admin@123` | System administrator, full access |
| 2 | 🚨 Responder | `responder@dm.com` | `Responder@123` | Emergency responder, acknowledge incidents |
| 3 | 👤 Citizen | `citizen@dm.com` | `Citizen@123` | Report incidents, view status |
| 4 | 🏛️ Official | `official@dm.com` | `Official@123` | Review reports, manage resources |

### User Details

#### Admin Account
```
Name: John Admin
Email: admin@dm.com
Password: Admin@123
Phone: +1-555-0101
Role: Administrator
Bio: System Administrator
Created: 2026-01-01
Profile Color: Deep Blue (#1E3A8A)
Features:
  - View all incidents
  - Edit any incident
  - Delete incidents
  - Manage users
  - System settings
  - View analytics
```

#### Responder Account
```
Name: Sarah Responder
Email: responder@dm.com
Password: Responder@123
Phone: +1-555-0102
Role: Responder
Bio: Emergency Response Team
Created: 2026-01-02
Profile Color: Orange (#EA580C)
Features:
  - Acknowledge incidents
  - Assign to team
  - Update incident status
  - View assigned incidents
  - Add notes
```

#### Citizen Account
```
Name: Mike Citizen
Email: citizen@dm.com
Password: Citizen@123
Phone: +1-555-0103
Role: Citizen
Bio: Community Member
Created: 2026-01-03
Profile Color: Green (#16A34A)
Features:
  - Report incidents
  - View own reports
  - Add photos/videos
  - Get notifications
  - View incident status
```

#### Official Account
```
Name: Dr. Patricia Official
Email: official@dm.com
Password: Official@123
Phone: +1-555-0104
Role: Official
Bio: Government Official
Created: 2026-01-04
Profile Color: Purple (#7C3AED)
Features:
  - Review reports
  - Manage resources
  - Generate reports
  - View analytics
  - Issue alerts
```

## 🚨 Incident Mock Data

### Incident 1: Building Fire - Downtown
```
ID: incident-1
Title: Building Fire - Downtown
Description: Major fire reported in commercial building downtown. 
Multiple fire trucks dispatched to scene.
Status: In Progress (🔴 In Progress)
Severity: Critical (🔴 Critical)
Location: 40.7128°N, 74.0060°W
Address: 123 Main Street, Downtown District
Reported By: citizen@dm.com (Mike Citizen)
Reported At: 2026-01-15 09:00 AM
Affected People: 45
Assigned Responders:
  - John Admin
  - Sarah Responder
  - (1 more)
Notes: 3 fire trucks, 2 ambulances on scene. Building evacuation underway.
Photos: 3 attached
Videos: 1 attached
Status Timeline:
  - 09:00 - Reported
  - 09:05 - Acknowledged by responders
  - 09:15 - In Progress
Color (Severity): Critical Red (#EF4444)
Color (Status): Amber/In Progress (#F59E0B)
```

### Incident 2: Road Accident - Highway 101
```
ID: incident-2
Title: Road Accident - Highway 101
Description: Multiple vehicle collision on highway causing traffic 
congestion. Medical assistance required.
Status: Acknowledged (🟦 Acknowledged)
Severity: High (🟧 High)
Location: 40.7500°N, 73.9900°W
Address: Highway 101, Near Exit 25
Reported By: responder@dm.com (Sarah Responder)
Reported At: 2026-01-15 10:30 AM
Affected People: 8
Assigned Responders:
  - John Admin
Photos: 2 attached
Videos: 0 attached
Notes: 4 vehicles involved. 2 injuries reported. Traffic rerouted.
Status Timeline:
  - 10:30 - Reported
  - 10:35 - Acknowledged by responders
  - (In progress)
Color (Severity): High Red (#EF4444)
Color (Status): Blue (#3B82F6)
```

### Incident 3: Flooding in Residential Area
```
ID: incident-3
Title: Flooding in Residential Area
Description: Heavy rainfall causing flooding in residential neighborhood. 
Multiple homes affected. Evacuation recommended.
Status: Reported (⚫ Reported)
Severity: Medium (🟨 Medium)
Location: 40.6800°N, 73.9700°W
Address: Residential Zone A, North Side
Reported By: citizen@dm.com (Mike Citizen)
Reported At: 2026-01-15 11:45 AM
Affected People: 120
Assigned Responders: (None yet)
Photos: 4 attached
Videos: 2 attached
Notes: Water level rising. Sandbags distributed. Evacuation centers set up.
Status Timeline:
  - 11:45 - Reported
  - (Awaiting acknowledgment)
Color (Severity): Medium Amber (#F59E0B)
Color (Status): Gray (#6B7280)
```

### Incident 4: Medical Emergency - School
```
ID: incident-4
Title: Medical Emergency - School
Description: Student collapsed during physical education class. 
Immediate medical attention provided.
Status: Resolved (✅ Resolved)
Severity: High (🟧 High)
Location: 40.7200°N, 74.0100°W
Address: Central High School, Sports Complex
Reported By: official@dm.com (Dr. Patricia Official)
Reported At: 2026-01-15 14:00 PM
Resolved At: 2026-01-15 14:45 PM
Affected People: 1
Assigned Responders:
  - School Nurse
  - EMT Team
Photos: 1 attached
Videos: 0 attached
Notes: Student stabilized and transported to hospital. Follow-up required.
Duration: 45 minutes
Status Timeline:
  - 14:00 - Reported
  - 14:05 - Acknowledged
  - 14:15 - In Progress
  - 14:45 - Resolved
Color (Severity): High Red (#EF4444)
Color (Status): Green (#10B981)
```

## 🎨 Color Codes Reference

### Role Colors
```
Admin:      #1E3A8A (Deep Blue)      RGB(30, 58, 138)
Responder:  #EA580C (Orange)         RGB(234, 88, 12)
Citizen:    #16A34A (Green)          RGB(22, 163, 74)
Official:   #7C3AED (Purple)         RGB(124, 58, 237)
```

### Status Colors
```
Reported:      #6B7280 (Gray)       RGB(107, 114, 128)
Acknowledged:  #3B82F6 (Blue)       RGB(59, 130, 246)
In Progress:   #F59E0B (Amber)      RGB(245, 158, 11)
Resolved:      #10B981 (Green)      RGB(16, 185, 129)
Closed:        #8B5CF6 (Purple)     RGB(139, 92, 246)
```

### Severity Colors
```
Low:       #10B981 (Green)      RGB(16, 185, 129)
Medium:    #F59E0B (Amber)      RGB(245, 158, 11)
High:      #EF4444 (Red)        RGB(239, 68, 68)
Critical:  #7C3AED (Purple)     RGB(124, 58, 237)
```

### Semantic Colors
```
Success:   #10B981 (Green)      RGB(16, 185, 129)
Warning:   #F59E0B (Amber)      RGB(245, 158, 11)
Error:     #EF4444 (Red)        RGB(239, 68, 68)
Info:      #3B82F6 (Blue)       RGB(59, 130, 246)
```

## 📊 Alert Mock Data

### Alert 1
```
ID: alert-1
Title: Building Fire Alert
Message: Major fire in downtown area. Avoid the zone.
Type: incident
Related Incident: incident-1
Timestamp: 2026-01-15 09:00 AM
IsRead: false
Severity: Critical
```

### Alert 2
```
ID: alert-2
Title: Traffic Disruption
Message: Road accident on Highway 101. Use alternate routes.
Type: warning
Related Incident: incident-2
Timestamp: 2026-01-15 10:30 AM
IsRead: true
Severity: High
```

### Alert 3
```
ID: alert-3
Title: Flood Warning
Message: Flooding in residential areas. Stay indoors.
Type: warning
Related Incident: incident-3
Timestamp: 2026-01-15 11:45 AM
IsRead: false
Severity: Medium
```

## 📦 Resource Mock Data

### Resource 1: Fire Truck Unit
```
ID: resource-1
Name: Fire Truck Unit 5
Type: vehicle
Description: Heavy rescue and firefighting vehicle
Location: Downtown Fire Station
Available: 1
Total: 1
Last Updated: 2026-01-15 09:00 AM
Status: Deployed to incident-1
```

### Resource 2: Medical Team
```
ID: resource-2
Name: Emergency Medical Team Alpha
Type: personnel
Description: 5-member emergency medical team
Location: Central Hospital
Available: 0
Total: 5
Last Updated: 2026-01-15 10:30 AM
Status: Responding to incident-2
```

### Resource 3: Sandbag Supplies
```
ID: resource-3
Name: Emergency Sandbag Stock
Type: equipment
Description: 1000 sandbags for flood management
Location: Emergency Warehouse
Available: 1000
Total: 1000
Last Updated: 2026-01-15 11:45 AM
Status: Distributing for incident-3
```

## 🗺️ Location Coordinates

### Incident Locations
```
Incident 1 (Building Fire):
  Latitude:  40.7128
  Longitude: -74.0060
  Address: 123 Main Street, Downtown District
  Zoom Level: 15

Incident 2 (Road Accident):
  Latitude:  40.7500
  Longitude: -73.9900
  Address: Highway 101, Near Exit 25
  Zoom Level: 14

Incident 3 (Flooding):
  Latitude:  40.6800
  Longitude: -73.9700
  Address: Residential Zone A, North Side
  Zoom Level: 13

Incident 4 (Medical Emergency):
  Latitude:  40.7200
  Longitude: -74.0100
  Address: Central High School, Sports Complex
  Zoom Level: 15
```

## 📅 Timeline Events

### Today's Events (2026-01-15)

| Time | Event | Status | Severity |
|------|-------|--------|----------|
| 09:00 | Building Fire reported | In Progress | 🔴 Critical |
| 10:30 | Road Accident reported | Acknowledged | 🟧 High |
| 11:45 | Flooding reported | Reported | 🟨 Medium |
| 14:00 | Medical Emergency reported | Resolved | 🟧 High |

### Mock Timestamps
```
Current Time: 2026-01-15 15:00 PM (3:00 PM)
Incident 1: 6 hours old - Ongoing
Incident 2: 4.5 hours old - In Progress
Incident 3: 3 hours 15 min old - Not started
Incident 4: 1 hour old - Completed (45 min response)
```

## 🔐 Password Policy (Demo Only)

```
All demo passwords follow pattern:
  [Role Name]@123

Examples:
  Admin@123
  Responder@123
  Citizen@123
  Official@123

Note: In production, use strong password policies:
  - Min 8 characters
  - Mix uppercase, lowercase, numbers, special chars
  - No dictionary words
  - No personal information
```

## 📝 Quick Copy-Paste Credentials

```
Admin:
  Email: admin@dm.com
  Pass: Admin@123

Responder:
  Email: responder@dm.com
  Pass: Responder@123

Citizen:
  Email: citizen@dm.com
  Pass: Citizen@123

Official:
  Email: official@dm.com
  Pass: Official@123
```

## 🧪 Testing Scenarios

### Scenario 1: Admin Views All
1. Login: `admin@dm.com` / `Admin@123`
2. Expected: See all 4 incidents
3. Color: Deep Blue theme
4. Capabilities: Edit, delete any incident

### Scenario 2: Responder Acknowledges
1. Login: `responder@dm.com` / `Responder@123`
2. Action: Click incident-3 (Flooding)
3. Expected: Can acknowledge and assign
4. Color: Orange theme

### Scenario 3: Citizen Reports
1. Login: `citizen@dm.com` / `Citizen@123`
2. Action: Click "Report Incident"
3. Expected: Form opens for new incident
4. Color: Green theme

### Scenario 4: Official Reviews
1. Login: `official@dm.com` / `Official@123`
2. Expected: See analytics, resources
3. Color: Purple theme
4. Capabilities: Generate reports

---

**Last Updated**: 2026  
**Total Demo Accounts**: 4  
**Total Mock Incidents**: 4  
**Total Alerts**: 3  
**Total Resources**: 3
