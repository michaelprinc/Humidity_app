# Android APK Builder Framework

This framework provides an easy way to convert your React/Vite Humidity App into Android APK files.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Android Studio with Android SDK
- Java Development Kit (JDK 11 or higher)
- Gradle

### Initial Setup
1. Run the initialization script from the project root:
```powershell
.\android-framework\scripts\init-capacitor.ps1
```

### Building APKs
Use the main build script from the project root:

```powershell
# Debug build (default)
.\build-android.ps1

# Release build
.\build-android.ps1 -Release

# Clean build
.\build-android.ps1 -Clean

# Custom APK name
.\build-android.ps1 -OutputName "MyCustomApp"

# Clean release build
.\build-android.ps1 -Clean -Release
```

## 📱 Features

- **Automatic timestamping**: APK files include build date/time
- **Debug and Release builds**: Choose appropriate build type
- **Clean builds**: Remove old artifacts before building
- **Custom naming**: Override default APK names
- **Size reporting**: Shows final APK file size
- **Asset optimization**: Automatically copies and optimizes web assets

## 📁 Output Location

All APK files are stored in the `/apks` folder with naming convention:
- `HumidityApp-debug-20250830-143022.apk`
- `HumidityApp-release-20250830-143022.apk`

## 🔧 Framework Structure

```
android-framework/
├── package.json              # Android-specific dependencies
├── capacitor.config.ts       # Capacitor configuration
├── scripts/
│   ├── init-capacitor.ps1    # Initialize Android framework
│   └── clean-android.ps1     # Clean build artifacts
└── android/                  # Android project (created after init)
    ├── app/
    │   ├── src/main/
    │   │   ├── AndroidManifest.xml
    │   │   ├── assets/        # Web app assets
    │   │   └── res/           # Android resources
    │   └── build.gradle
    └── gradle/
```

## ⚙️ Configuration

### Capacitor Config
The framework automatically configures:
- App ID: `com.humidity.app`
- App Name: `Humidity App`
- Web directory: `../dist`
- Android permissions for location, network, etc.

### Android Permissions
Automatically includes permissions for:
- Internet access
- Network state
- Location services (fine and coarse)
- Wake lock
- Vibration

### Gradle Optimizations
- Increased heap size for faster builds
- Parallel processing enabled
- Build caching enabled
- AndroidX support

## 🛠️ Customization

### App Icons
Replace icons in `android/app/src/main/res/mipmap-*` folders:
- `mipmap-mdpi`: 48x48px
- `mipmap-hdpi`: 72x72px
- `mipmap-xhdpi`: 96x96px
- `mipmap-xxhdpi`: 144x144px
- `mipmap-xxxhdpi`: 192x192px

### Splash Screen
Customize splash screen in `android/app/src/main/res/drawable/` folders.

### App Theme
Modify colors and themes in `android/app/src/main/res/values/` folders.

## 🔍 Troubleshooting

### Common Issues

1. **Gradle build fails**
   - Ensure JAVA_HOME is set correctly
   - Check Android SDK installation
   - Run `.\android-framework\scripts\clean-android.ps1`

2. **Capacitor sync fails**
   - Check that React build completed successfully
   - Verify `dist` folder exists and contains built files

3. **APK not generated**
   - Check Gradle daemon status
   - Verify Android SDK licenses are accepted
   - Ensure sufficient disk space

### Debug Commands
```powershell
# Check Android SDK
$env:ANDROID_HOME\tools\bin\sdkmanager --list

# Check Java version
java -version

# Check Gradle version
cd android-framework\android
.\gradlew --version

# Manual sync
cd android-framework
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 📋 Build Process Steps

1. **Clean** (if requested): Remove old build artifacts
2. **React Build**: Run `npm run build` to create web assets
3. **Capacitor Init**: Initialize Android project if needed
4. **Copy Assets**: Copy web assets to Android project
5. **Sync**: Sync Capacitor configuration
6. **Android Build**: Run Gradle to build APK
7. **Finalize**: Copy and rename APK with timestamp

## 🎯 Best Practices

- Always test debug builds before creating release builds
- Use clean builds when experiencing issues
- Keep Android SDK and tools updated
- Test APKs on real devices for best validation
- Monitor APK size to ensure optimal performance

## 📞 Support

For issues specific to the Humidity App Android build:
1. Check this documentation
2. Review build logs for error details
3. Try clean builds
4. Verify prerequisites are installed correctly
