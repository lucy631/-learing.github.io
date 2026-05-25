@echo off
echo 小奥学习 - 本地服务器
echo.
echo 1. 确保手机和电脑在同一 WiFi
echo 2. 手机 Chrome 打开下面显示的地址
echo 3. 菜单 - 添加到主屏幕
echo.
python -m http.server 8080
pause
