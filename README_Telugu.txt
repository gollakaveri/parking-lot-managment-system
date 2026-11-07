PARKING LOT MANAGEMENT SYSTEM - FIXED VERSION
================================================

ఈ project మీ message లో ఇచ్చిన column names ఆధారంగా తయారు చేయబడింది.

TABLES:
1. person
   user_id, user_name, phonenumber, email, role

2. parking_slots
   slot_id, slot_number, vehicle_type, loaction, status

3. vehicles
   vehicle_id, user_id, vehicle_number, vehicle_type

4. parking_records
   record_id, vehicle_id, slot_id, entry_time, exit_time, parking_fee, status

గమనిక:
- parking_slots లో మీరే ఇచ్చిన "loaction" spelling నే code లో వాడాం.
- Primary key columns auto increment అని భావించాం.
- Database పేరు users.
- ఇప్పటికే ఉన్న database/table data ని delete చేయాల్సిన అవసరం లేదు.
- db.sql execute చేయాల్సిన అవసరం లేదు; ఈ ZIP లో db.sql లేదు.

SETUP:
1. ZIP extract చేయండి.
2. app.js లో password: "root" దగ్గర మీ MySQL password పెట్టండి.
3. Folder లో address bar పై cmd అని type చేసి Enter నొక్కండి.
4. Run:
   npm install
   npm start
5. Browser లో http://localhost:3000 open చేయండి.

CRUD:
People, Parking Slots, Vehicles, Parking Records అన్నింటికీ
Create, Read, Update, Delete pages ఉన్నాయి.

API:
GET    /api/people
GET    /api/slots
GET    /api/vehicles
GET    /api/records
POST   /api/:resource
PUT    /api/:resource/:id
DELETE /api/:resource/:id

PARKING RECORD LOGIC:
- New active parking record create చేస్తే slot status Occupied అవుతుంది.
- Record status Completed చేస్తే slot status Available అవుతుంది.
- Active record delete చేస్తే slot మళ్లీ Available అవుతుంది.

IMPORTANT:
మీ actual MySQL columns లో spelling లేదా data type వేరుగా ఉంటే,
app.js లో అదే column names ఉండాలి. మీరు పంపిన code లోని "loaction"
typo నిజంగా database లో "location" అయితే app.js మరియు common.js లో
loaction ని location గా మార్చాలి.
