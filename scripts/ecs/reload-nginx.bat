@echo off
rem 以 SYSTEM 身份运行(SCHTASKS):nginx 是计划任务 wordpark-nginx 以 SYSTEM 起的,
rem 管理员会话直接 nginx.exe -s reload 会报 OpenEvent Access denied
cd /d C:\Users\Administrator\Desktop\nginx-1.31.8
nginx.exe -t
nginx.exe -s reload
