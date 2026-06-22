@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0
@rem
@setlocal
@set DIRNAME=%~dp0
@set APP_BASE_NAME=%~n0
@set APP_HOME=%DIRNAME%

@set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

@set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@if "%JAVA_HOME%" == "" goto findJavaFromPath
@set JAVA_EXE=%JAVA_HOME%/bin/java.exe
@goto execute

:findJavaFromPath
@for %%i in (java.exe) do @set JAVA_EXE=%%~$PATH:i

:execute
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
@endlocal
