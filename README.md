# REJG Legacy Properties — Housing App

**A REJG Legacy Labs LLC product | Operated by REJG Legacy Properties LLC**

The REJG Legacy Properties Housing App is the internal operations platform for REJG Legacy Properties — a drug- and alcohol-free transitional housing company serving HOH Foundation residents AND outside clients.

## Ownership & Licensing
- **IP Owner:** REJG Legacy Labs LLC (rejglegacylabs@gmail.com)
- **Operator:** REJG Legacy Properties LLC (rejglegacyproperties@gmail.com)
- **Parent:** RE Jones Global LLC
- **Phone:** 512-541-2395
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731

## Platform Features
- Property and bed management (8 properties, 75 beds)
- Resident placement and occupancy tracking
- Rent collection and invoicing
- Maintenance request management
- CRM pipeline for outside clients
- Document templates: Master Lease, Housing Agreement, Inspection Report, Maintenance Form, Rent Receipt
- Financial reporting

## Ecosystem Sync Schedule
| Time (CT) | From | To | Data |
|-----------|------|----|------|
| 6:00 AM | REJG Legacy Properties App | Command Center Finance | Rent, occupancy, net income |
| 6:00 AM | REJG Legacy Properties App | Pathways Hub OS | Bed availability, placements |

## Development
```bash
git clone https://github.com/rejg-legacylabs/legacy-properties
cd legacy-properties
npm install
cp .env.example .env.local
npm run dev
```

Set in `.env.local`:
```
VITE_BASE44_APP_ID=69da82da88110c360468da13
```

---
Built on [Base44](https://base44.com) | REJG Legacy Labs LLC | REJG Legacy Properties LLC | RE Jones Global LLC | May 2026
