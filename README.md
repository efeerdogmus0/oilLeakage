# Yağ Kaçağı Tespit Sistemi - Drone Simülatörü

Bu proje, insansız hava araçları (drone) kullanarak denizde yağ kaçaklarını tespit etmek için geliştirilmiş bir sistemdir. Flask temelli bir web arayüzü ve drone simülatörü içerir.

## Simülatör Hakkında

Proje, gerçek bir drone olmadan geliştirme ve test yapabilmeniz için bir drone simülatörü içerir. Bu simülatör, gerçek bir drone'un davranışlarını taklit eder ve bilgisayarınızın kamerasını drone kamerası olarak kullanır.

### Bileşenler

1. **Drone Simülatörü (`drone_simulator.py`)**: TCP soket üzerinden bağlantı kabul eder ve bir drone gibi davranır. Konum, batarya durumu, yükseklik gibi verileri simüle eder ve bilgisayarınızın kamerasını kullanarak görüntü sağlar.

2. **Drone Adaptörü (`drone_adapter.py`)**: Simülatör ile `DroneControl` sınıfı arasında arayüz sağlar. TCP soketi üzerinden simülatöre bağlanır ve komutları iletir.

3. **Drone Kontrolcüsü (`drone_control.py`)**: Yüksek seviyeli drone kontrolü için API sağlar. Adaptör ile iletişim kurarak drone hareketlerini ve komutlarını yönetir.

4. **Web Arayüzü (`app.py`)**: Flask tabanlı web uygulaması. Drone'u kontrol etmek ve yağ kaçağı tespitlerini görüntülemek için bir kullanıcı arayüzü sağlar.

## Kurulum

1. Gerekli kütüphaneleri yükleyin:

```bash
pip install flask flask-socketio dronekit opencv-python numpy
```

2. Simülatörü başlatın:

```bash
python drone_simulator.py
```

3. Web arayüzünü başka bir terminal penceresinde başlatın:

```bash
python app.py
```

4. Tarayıcınızda `http://localhost:5000` adresine giderek web arayüzüne erişin.

## Simülatör Özellikleri

- **Gerçekçi Hareketler**: Drone'un gerçekçi hareketi ve pozisyon güncellemesi
- **Kamera Simülasyonu**: Bilgisayarınızın web kamerasını drone kamerası olarak kullanma
- **Yağ Kaçağı Tespiti**: Tarama sırasında rastgele yağ kaçağı tespiti simülasyonu
- **Gerçek Zamanlı Durum Güncellemesi**: Drone'un konum, pil durumu ve diğer durumlarını gerçek zamanlı olarak güncelleme

## Kullanım

1. Web arayüzünde "Connect" butonuna tıklayarak drone'a bağlanın.
2. "Arm" butonuna tıklayarak drone'u hazır hale getirin.
3. "Takeoff" butonuna tıklayarak drone'u kaldırın.
4. "Map" sekmesinden bir tarama alanı seçin ve tarama başlatın.
5. Tespitler otomatik olarak harita üzerinde görüntülenecektir.

## API Komutları

Simülatör aşağıdaki komutları kabul eder:

- `connect`: Drone'a bağlanma
- `arm`: Drone'u kol alma
- `takeoff <altitude>`: Belirtilen yüksekliğe kalkış
- `land`: İniş
- `rtl`: Başlangıç noktasına dönüş
- `goto <lat> <lon> [altitude]`: Belirtilen konuma gitme
- `speed <speed>`: Uçuş hızını ayarlama
- `scan <nw_lat> <nw_lon> <se_lat> <se_lon> [distance]`: Alan taraması başlatma
- `cancel_scan`: Taramayı iptal etme

## WebSocket Olayları

Web arayüzü aşağıdaki SocketIO olaylarını destekler:

- `connect`: Bağlantı kurulduğunda
- `disconnect`: Bağlantı koptuğunda
- `drone_status`: Drone durum güncellemesi
- `scan_status`: Tarama durum güncellemesi
- `new_detection`: Yeni yağ kaçağı tespiti

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 