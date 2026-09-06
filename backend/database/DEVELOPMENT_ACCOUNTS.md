# Local Development Accounts

These fictional credentials are for local BLUEWRITE development only. Rotate or remove them before any deployment.

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `BluewriteAdmin!2026` |
| Officer (Marcus Reyes, available after running `database/seed.sql`) | `mreyes` | `BluewriteOfficer!2026` |

Passwords are stored in MySQL only as bcrypt hashes (cost factor 12). This file is development documentation, not frontend or production configuration.

The Admin-only minimal reset does not create an Officer account. Run the fictional development seed if Officer workflow testing is required.