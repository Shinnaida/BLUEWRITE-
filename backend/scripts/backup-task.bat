@echo off
rem BLUEWRITE - scheduled database backup entry point (used by Task Scheduler)
rem Logs to backups\schedule.log so scheduled runs can be audited.
cd /d "C:\Users\Shaine Jayme\Desktop\CAPS\BLUEWRITE\backend"
if not exist backups mkdir backups
"C:\Program Files\Git\bin\bash.exe" ./scripts/backup.sh >> backups\schedule.log 2>&1
