Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c npm run dev", 0
WshShell.Run "cmd /c timeout 5 && start http://localhost:3000", 0
