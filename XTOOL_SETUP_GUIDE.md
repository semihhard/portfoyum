# Portfoyum - iPhone'a Yükleme ve xtool Altyapı Rehberi

Bu rehber, **Portfoyum** (Fon/Portföy Takip) uygulamasını `xtool` veya alternatif pratik yöntemlerle fiziksel iPhone cihazınıza yüklemek için gerekli adımları açıklar.

---

## 🛠️ Projede Hazırlanan Altyapı

1. **`Package.swift`**: Proje standart Swift Package Manager (SwiftPM) uyumlu hale getirildi.
2. **`xtool.yml`**: `bundleID: com.portfoyum.app` ve `infoPath: Info.plist` tanımlandı.
3. **`Info.plist`**: iOS bundle ve izin yapılandırmaları eklendi.
4. **`Sources/Portfoyum/PortfoyumApp.swift`**: `@main` SwiftUI uygulama giriş noktası oluşturuldu.
5. **`.github/workflows/build-ios.yml`**: Bulutta otomatik derleme ve IPA üretim iş akışı güncellendi.

---

## 🚀 Seçenek 1: `xtool` ile Windows (WSL) Üzerinden iPhone'a Yükleme

`xtool`, Linux altyapısı kullandığı için Windows üzerinde **WSL2 (Ubuntu)** ve **USB köprüsü** ile çalışır.

### Adım 1: Windows Tarafını Hazırlama (PowerShell Yönetici Olarak)

```powershell
# 1. WSL'i kurun (Bilgisayarı yeniden başlatmanız gerekebilir)
wsl --install

# 2. iPhone'u WSL'e yönlendirebilmek için USB köprüsünü kurun
winget install dorssel.usbipd-win
```

### Adım 2: WSL (Ubuntu) Ortamını Hazırlama

WSL terminalinizi açın ve aşağıdaki komutları çalıştırın:

```bash
# 1. Gerekli araçları yükleyin
sudo apt update && sudo apt install -y usbmuxd libimobiledevice-utils curl git zip

# 2. xtool'u indirin ve kurun
curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o xtool
chmod +x xtool
sudo mv xtool /usr/local/bin/

# 3. Swift derleyicisini kurun (Swift 6.0+)
# Detay: https://www.swift.org/install/linux/
```

### Adım 3: Apple Hesabı ve SDK Kurulumu

1. [developer.apple.com](https://developer.apple.com/download/all/?q=Xcode) adresinden ücretsiz Apple ID'niz ile `Xcode.xip` dosyasını Windows'a indirin (örneğin İndirilenler klasörüne).
2. WSL terminalinde proje klasörüne gidin:
   ```bash
   cd /mnt/c/Users/Admin/Documents/antigravity/kind-pascal
   ```
3. `xtool setup` komutunu çalıştırın:
   ```bash
   xtool setup
   ```
   * İndirdiğiniz `Xcode.xip` yolunu belirtin (örneğin: `/mnt/c/Users/Admin/Downloads/Xcode_16.xip`).
   * Apple ID e-posta ve şifrenizi girerek kimlik doğrulaması yapın.

### Adım 4: iPhone'u Bağlama ve Çalıştırma

1. iPhone'unuzu USB ile bilgisayara bağlayın ve ekrandaki **"Bu Bilgisayara Güven"** uyarısını onaylayın.
2. Windows PowerShell'de (Yönetici) USB aygıtını WSL'e bağlayın:
   ```powershell
   usbipd list
   # Apple Mobile Device cihazınızın BUSID değerini bulun (örneğin 2-1)
   usbipd attach --wsl --busid <BUSID>
   ```
3. WSL terminalinde derleyip doğrudan iPhone'a yükleyin:
   ```bash
   xtool dev
   ```
   `xtool`, uygulamayı derler, Apple ID'nizle imzalar ve doğrudan iPhone'unuza yükleyip çalıştırır!

---

## ⚡ Seçenek 2: GitHub Actions + Sideloadly (En Hızlı ve Zahmetsiz Yol)

WSL kurmak ve 12 GB `Xcode.xip` indirmek istemiyorsanız:

1. Bu depoyu GitHub'a push edin:
   ```bash
   git add .
   git commit -m "feat: xtool and iOS app infrastructure"
   git push
   ```
2. GitHub'da **Actions** sekmesine gidin -> **Build iOS IPA Package** iş akışını seçip **Run workflow** deyin.
3. Derleme tamamlandığında **Artifacts** kısmından `Portfoyum-iOS-App` (`Portfoyum.ipa`) dosyasını indirin.
4. Windows için [Sideloadly](https://sideloadly.io/) aracını indirin.
5. iPhone'u USB ile bağlayın, `Portfoyum.ipa` dosyasını Sideloadly penceresine sürükleyin, Apple ID'nizi yazıp **Start**'a basın.
6. Uygulama saniyeler içinde iPhone ana ekranınıza gelir.
   *(İlk açılışta iPhone: **Ayarlar > Genel > VPN ve Aygıt Yönetimi** altından geliştirici profiline Güven demeniz yeterlidir.)*
