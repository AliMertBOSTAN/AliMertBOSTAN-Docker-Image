# MERT Token Exchange - Docker Setup

Üç ayrı repoyu (contracts, backend, frontend) birleştirerek tek bir `docker-compose` komutu ile çalıştırır.

## Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                   DOCKER COMPOSE NETWORK                    │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐   │
│  │   HARDHAT    │    │   BACKEND   │    │   FRONTEND   │   │
│  │  (Node.js)   │    │  (Express)  │    │   (Nginx)    │   │
│  │  Port: 8545  │◄───│  Port: 3000 │◄───│   Port: 80   │   │
│  │  Chain: 31337│    │  SQLite DB  │    │  React SPA   │   │
│  └──────┬───────┘    └──────┬──────┘    └──────────────┘   │
│         │                   │                               │
│         │   ┌───────────┐   │                               │
│         └──►│ DEPLOYER  │───┘                               │
│             │ (tek sefer)│  addresses.json                   │
│             └───────────┘  (shared volume)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Başlangıç Sırası

1. **Hardhat Node** → Yerel blockchain başlar (port 8545)
2. **Deployer** → Kontratları deploy eder, adresleri `addresses.json`'a yazar
3. **Backend** → `addresses.json`'dan adresleri okur, Express API başlar (port 3000)
4. **Frontend** → Nginx ile React SPA servis eder (port 80)

## Hızlı Başlangıç

```bash
# Tüm servisleri başlat
docker-compose up --build

# Arka planda çalıştır
docker-compose up --build -d

# Logları takip et
docker-compose logs -f

# Belirli bir servisin loglarını gör
docker-compose logs -f backend

# Durdur
docker-compose down

# Tüm verileri silerek durdur (volume'lar dahil)
docker-compose down -v
```

## Erişim

| Servis    | URL                          | Açıklama                |
|-----------|------------------------------|------------------------|
| Frontend  | http://localhost              | React SPA (Ana sayfa)  |
| Backend   | http://localhost:3000/api     | Express REST API       |
| Hardhat   | http://localhost:8545         | Ethereum JSON-RPC      |
| Health    | http://localhost:3000/api/health | API sağlık kontrolü |

## Varsayılan Hesaplar

### Admin Kullanıcı (Backend)
- **Kullanıcı adı:** `admin`
- **Şifre:** `admin123`

### Hardhat Hesap #0 (Blockchain Admin)
- **Adres:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

> ⚠️ Bu private key sadece geliştirme ortamı içindir. Production'da asla kullanmayın!

## Ortam Değişkenleri

`.env` dosyasını düzenleyerek yapılandırmaları değiştirebilirsiniz:

| Değişken             | Varsayılan                        | Açıklama                      |
|----------------------|-----------------------------------|-------------------------------|
| `HARDHAT_PORT`       | `8545`                            | Blockchain RPC portu          |
| `BACKEND_PORT`       | `3000`                            | Backend API portu             |
| `FRONTEND_PORT`      | `80`                              | Frontend web portu            |
| `JWT_SECRET`         | `mert-token-exchange-super-...`   | JWT imzalama anahtarı         |
| `VITE_API_URL`       | `http://localhost:3000/api`       | Frontend → Backend API URL    |
| `VITE_WC_PROJECT_ID` | `demo-project-id`                 | WalletConnect proje ID        |

## Servis Detayları

### Hardhat Node
- Hardhat v3 ile yerel Ethereum blockchain
- Chain ID: `31337`
- Otomatik madencilik (her işlem anında onaylanır)
- 20 adet test hesabı (her biri 10,000 ETH ile)

### Deployer (Tek Seferlik)
- 4 kontratı deploy eder: `SimplePriceOracle`, `MERT`, `MockTRB`, `TokenSale`
- Kontratları birbirine bağlar (Oracle ↔ Token, Sale wiring)
- Sale kontratına 1,000,000 MERT likidite yükler
- Adresleri `/deploy-output/addresses.json` dosyasına kaydeder

### Backend (Express API)
- **Auth:** Kullanıcı kayıt/giriş (JWT tabanlı)
- **Wallet:** MetaMask cüzdan bağlama + KYC kaydı
- **Trade:** MERT token alım/satım
- **Admin:** Fiyat güncelleme, token basma, KYC yönetimi
- **DB:** SQLite (kalıcı volume'da saklanır)

### Frontend (React SPA)
- Vite ile build edilir, Nginx ile servis edilir
- RainbowKit ile cüzdan bağlantısı
- Türkçe/İngilizce dil desteği
- Dark/Light tema

## Sorun Giderme

### Port çakışması
```bash
# Portları değiştirmek için .env dosyasını düzenleyin
HARDHAT_PORT=18545
BACKEND_PORT=13000
FRONTEND_PORT=8080
```

### Kontratları yeniden deploy etme
```bash
docker-compose down -v   # Volume'ları sil
docker-compose up --build
```

### Tek bir servisi yeniden başlatma
```bash
docker-compose restart backend
```

### Container içine girme
```bash
docker exec -it gcl-backend sh
docker exec -it gcl-hardhat sh
```
