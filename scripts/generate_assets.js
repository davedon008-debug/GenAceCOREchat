const fs = require('fs');
const path = require('path');

const iconPath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\fff3c61d-5398-483b-a924-5d1b52874cf9\\app_logo_icon_1789595600986.png';
const splashPath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\fff3c61d-5398-483b-a924-5d1b52874cf9\\app_splash_logo_1789595615713.png';

const assetsDir = path.join(__dirname, '..', 'mobile', 'assets');
const frontendPublicDir = path.join(__dirname, '..', 'frontend', 'public');

// 1. mobile/assets/icon.png
fs.copyFileSync(iconPath, path.join(assetsDir, 'icon.png'));
console.log('✓ Updated mobile/assets/icon.png');

// 2. mobile/assets/android-icon-foreground.png
fs.copyFileSync(iconPath, path.join(assetsDir, 'android-icon-foreground.png'));
console.log('✓ Updated mobile/assets/android-icon-foreground.png');

// 3. mobile/assets/android-icon-background.png
fs.copyFileSync(iconPath, path.join(assetsDir, 'android-icon-background.png'));
console.log('✓ Updated mobile/assets/android-icon-background.png');

// 4. mobile/assets/android-icon-monochrome.png
fs.copyFileSync(iconPath, path.join(assetsDir, 'android-icon-monochrome.png'));
console.log('✓ Updated mobile/assets/android-icon-monochrome.png');

// 5. mobile/assets/favicon.png
fs.copyFileSync(iconPath, path.join(assetsDir, 'favicon.png'));
console.log('✓ Updated mobile/assets/favicon.png');

// 6. mobile/assets/splash-icon.png
fs.copyFileSync(splashPath, path.join(assetsDir, 'splash-icon.png'));
console.log('✓ Updated mobile/assets/splash-icon.png');

// 7. frontend/public assets
if (fs.existsSync(frontendPublicDir)) {
  fs.copyFileSync(iconPath, path.join(frontendPublicDir, 'favicon.png'));
  fs.copyFileSync(iconPath, path.join(frontendPublicDir, 'logo512.png'));
  console.log('✓ Updated frontend/public assets');
}
