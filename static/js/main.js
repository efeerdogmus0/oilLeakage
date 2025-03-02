/**
 * Yağ Kaçağı Tespit Sistemi Ana JavaScript Dosyası
 * Bu dosya, tüm sayfalarda ortak kullanılan JavaScript işlevlerini içerir.
 * Özellikle Socket.IO bağlantısı, drone durumu güncelleme ve ortak UI işlevleri burada yer alır.
 */

// Genel uygulama nesnesi
const YağKaçağıUygulaması = {
    socket: null,
    drone: {
        bağlantı: false,
        durum: "Bağlantı Bekleniyor",
        arm: false,
        mod: null,
        konum: null,
        pil: null
    },
    tarama: {
        aktif: false,
        iptal_edildi: false,
        tamamlanma_yüzdesi: 0
    },
    tespitler: [],
    
    // Uygulama başlatma
    başlat: function() {
        console.log("Yağ Kaçağı Tespit Sistemi başlatılıyor...");
        this.socketBağlantısınıKur();
        this.olayDinleyicileriniEkle();
    },
    
    // Socket.IO bağlantısını kur
    socketBağlantısınıKur: function() {
        this.socket = io();
        
        // Bağlantı olayları
        this.socket.on('connect', function() {
            console.log("Socket.IO sunucusuna bağlandı");
            $('#bağlantı-durumu').removeClass('text-danger').addClass('text-success').text('Bağlı');
        });
        
        this.socket.on('disconnect', function() {
            console.log("Socket.IO sunucusu ile bağlantı kesildi");
            $('#bağlantı-durumu').removeClass('text-success').addClass('text-danger').text('Bağlantı Kesildi');
        });
        
        // Drone durum güncellemesi
        this.socket.on('drone_durum', function(durum) {
            YağKaçağıUygulaması.drone = durum;
            YağKaçağıUygulaması.droneDurumuGüncelle();
        });
        
        // Tarama durum güncellemesi
        this.socket.on('tarama_durum', function(durum) {
            YağKaçağıUygulaması.tarama = durum;
            YağKaçağıUygulaması.taramaDurumuGüncelle();
        });
        
        // Yeni tespit olayı
        this.socket.on('yeni_tespit', function(tespit) {
            YağKaçağıUygulaması.tespitler.unshift(tespit); // Listeye başa ekle
            if (YağKaçağıUygulaması.tespitler.length > 20) {
                YağKaçağıUygulaması.tespitler.pop(); // Listedeki son öğeyi çıkar (en fazla 20 tespit göster)
            }
            YağKaçağıUygulaması.tespitListesiniGüncelle();
            YağKaçağıUygulaması.bildirimGöster('Yeni Tespit', `ID: ${tespit.id} - Konumda yağ kaçağı tespit edildi!`);
        });
    },
    
    // Olay dinleyicileri ekle
    olayDinleyicileriniEkle: function() {
        // Drone bağlantı butonları
        $('#btn-bağlan').click(function() {
            $('#bağlantı-modal').modal('show');
        });
        
        $('#btn-bağlantı-kaydet').click(function() {
            const bağlantıAdresi = $('#bağlantı-adresi').val();
            YağKaçağıUygulaması.droneBağlan(bağlantıAdresi);
            $('#bağlantı-modal').modal('hide');
        });
        
        $('#btn-bağlantıyı-kes').click(function() {
            YağKaçağıUygulaması.droneBağlantıyıKes();
        });
        
        // Drone kontrol butonları
        $('#btn-arm').click(function() {
            YağKaçağıUygulaması.droneArmEt();
        });
        
        $('#btn-kalk').click(function() {
            const yükseklik = $('#drone-yükseklik').val();
            YağKaçağıUygulaması.droneKalk(yükseklik);
        });
        
        $('#btn-iniş').click(function() {
            YağKaçağıUygulaması.droneİnişYap();
        });
        
        $('#btn-rtl').click(function() {
            YağKaçağıUygulaması.droneRTL();
        });
        
        // Parametre ayarlama butonları
        $('#btn-yükseklik-ayarla').click(function() {
            const yükseklik = $('#drone-yükseklik').val();
            YağKaçağıUygulaması.droneYükseklikAyarla(yükseklik);
        });
        
        $('#btn-hız-ayarla').click(function() {
            const hız = $('#drone-hız').val();
            YağKaçağıUygulaması.droneHızAyarla(hız);
        });
        
        // Konum gönderme butonu
        $('#btn-konum-git').click(function() {
            const enlem = $('#hedef-enlem').val();
            const boylam = $('#hedef-boylam').val();
            const yükseklik = $('#drone-yükseklik').val();
            
            if (!enlem || !boylam) {
                alert('Lütfen geçerli enlem ve boylam değerleri girin.');
                return;
            }
            
            YağKaçağıUygulaması.droneKonumaGit(enlem, boylam, yükseklik);
        });
        
        // Tarama butonları
        $('#btn-tarama').click(function() {
            $('#tarama-modal').modal('show');
        });
        
        $('#btn-tarama-iptal').click(function() {
            YağKaçağıUygulaması.taramaİptalEt();
        });
    },
    
    // Drone durum bilgisini güncelle
    droneDurumuGüncelle: function() {
        // Durum alanı varsa güncelle
        if ($('#drone-durum').length) {
            let durumHTML = '';
            
            if (this.drone.bağlantı) {
                let durumSınıfı = this.drone.arm ? 'success' : 'warning';
                
                durumHTML = `
                    <div class="alert alert-${durumSınıfı}">
                        <h6 class="mb-1"><strong>Durum:</strong> ${this.drone.durum}</h6>
                        <p class="mb-1"><strong>Arm:</strong> ${this.drone.arm ? 'Evet' : 'Hayır'}</p>
                        <p class="mb-1"><strong>Mod:</strong> ${this.drone.mod || 'Bilinmiyor'}</p>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <div class="card">
                                <div class="card-body p-2">
                                    <p class="mb-0"><strong>Yükseklik:</strong> ${this.drone.konum ? this.drone.konum.yükseklik.toFixed(1) + ' m' : 'Bilinmiyor'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="card">
                                <div class="card-body p-2">
                                    <p class="mb-0"><strong>Pil:</strong> ${this.drone.pil ? this.drone.pil.seviye + '%' : 'Bilinmiyor'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body p-2">
                            <p class="mb-1"><strong>Konum:</strong></p>
                            <p class="mb-0 small">
                                ${this.drone.konum ? 
                                    `Enlem: ${this.drone.konum.enlem.toFixed(6)}<br>Boylam: ${this.drone.konum.boylam.toFixed(6)}` :
                                    'Konum bilgisi yok'}
                            </p>
                        </div>
                    </div>
                `;
            } else {
                durumHTML = `
                    <div class="alert alert-secondary">
                        <p class="mb-0">Drone bağlı değil. Bağlanmak için "Bağlan" butonuna tıklayın.</p>
                    </div>
                `;
            }
            
            $('#drone-durum').html(durumHTML);
        }
        
        // Butonları güncelle
        this.kontrolButonlarınıGüncelle();
    },
    
    // Tarama durumunu güncelle
    taramaDurumuGüncelle: function() {
        // Tarama durumu alanı varsa güncelle
        if ($('#tarama-durum').length) {
            if (this.tarama.aktif) {
                $('#tarama-durum').removeClass('d-none');
                $('#tarama-ilerleme').css('width', this.tarama.tamamlanma_yüzdesi + '%');
            } else {
                $('#tarama-durum').addClass('d-none');
            }
        }
    },
    
    // Kontrol butonlarını güncelle
    kontrolButonlarınıGüncelle: function() {
        // Bağlantı butonları
        $('#btn-bağlan').prop('disabled', this.drone.bağlantı);
        $('#btn-bağlantıyı-kes').prop('disabled', !this.drone.bağlantı);
        
        // Drone kontrol butonları
        $('#btn-arm').prop('disabled', !this.drone.bağlantı || this.drone.arm);
        $('#btn-kalk').prop('disabled', !this.drone.bağlantı || !this.drone.arm);
        $('#btn-iniş').prop('disabled', !this.drone.bağlantı || !this.drone.arm);
        $('#btn-rtl').prop('disabled', !this.drone.bağlantı || !this.drone.arm);
        $('#btn-konum-git').prop('disabled', !this.drone.bağlantı || !this.drone.arm);
        
        // Tarama butonları
        $('#btn-tarama').prop('disabled', !this.drone.bağlantı || this.tarama.aktif);
    },
    
    // Tespit listesini güncelle
    tespitListesiniGüncelle: function() {
        // Tespit listesi varsa güncelle
        if ($('#tespit-listesi').length) {
            if (this.tespitler.length === 0) {
                $('#tespit-listesi').html('<tr><td colspan="6" class="text-center">Henüz tespit bulunmuyor.</td></tr>');
                return;
            }
            
            let tespitHTML = '';
            
            this.tespitler.forEach(function(tespit) {
                tespitHTML += `
                    <tr>
                        <td>${tespit.id}</td>
                        <td>${tespit.tarih}</td>
                        <td>${tespit.konum ? tespit.konum.enlem.toFixed(6) + ', ' + tespit.konum.boylam.toFixed(6) : 'Bilinmiyor'}</td>
                        <td>${tespit.yağ_kaçağı_sayısı || 0}</td>
                        <td>${tespit.gemi_var ? 'Evet' : 'Hayır'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="tespitDetayGöster(${tespit.id})">
                                <i class="fas fa-search-plus"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#tespit-listesi').html(tespitHTML);
        }
    },
    
    // Bildirim göster
    bildirimGöster: function(başlık, mesaj) {
        // Tarayıcı bildirimlerini kullan
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(başlık, {
                body: mesaj,
                icon: '/static/img/logo.png'
            });
        } else if ("Notification" in window && Notification.permission !== "denied") {
            // İzin iste
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    new Notification(başlık, {
                        body: mesaj,
                        icon: '/static/img/logo.png'
                    });
                }
            });
        }
        
        // Ekranda bildirim göster
        const bildirimHTML = `
            <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
                <div class="toast-header bg-primary text-white">
                    <strong class="me-auto">${başlık}</strong>
                    <small>${new Date().toLocaleTimeString()}</small>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Kapat"></button>
                </div>
                <div class="toast-body">
                    ${mesaj}
                </div>
            </div>
        `;
        
        const bildirimKonteyner = $('#bildirim-konteyner');
        if (bildirimKonteyner.length) {
            bildirimKonteyner.append(bildirimHTML);
            $('.toast').toast('show');
        }
    },
    
    // DRONE API FONKSİYONLARI
    
    // Drone'a bağlan
    droneBağlan: function(bağlantıAdresi) {
        $.ajax({
            url: '/api/drone/bağlan',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                bağlantı_adresi: bağlantıAdresi
            }),
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Bağlantısı', 'Drone\'a başarıyla bağlanıldı.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Drone Bağlantı Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Drone bağlantısını kes
    droneBağlantıyıKes: function() {
        $.ajax({
            url: '/api/drone/bağlantıyı_kes',
            type: 'POST',
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Bağlantısı', 'Drone bağlantısı kesildi.');
                }
            }
        });
    },
    
    // Drone'u arm et
    droneArmEt: function() {
        $.ajax({
            url: '/api/drone/arm_et',
            type: 'POST',
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrolü', 'Drone başarıyla arm edildi.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrol Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Drone'u kaldır
    droneKalk: function(yükseklik) {
        $.ajax({
            url: '/api/drone/kalk',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                yükseklik: yükseklik
            }),
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrolü', 'Kalkış başlatıldı.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrol Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Drone'u indir
    droneİnişYap: function() {
        $.ajax({
            url: '/api/drone/iniş_yap',
            type: 'POST',
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrolü', 'İniş başlatıldı.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrol Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Drone'u başlangıç noktasına döndür
    droneRTL: function() {
        $.ajax({
            url: '/api/drone/rtl',
            type: 'POST',
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrolü', 'Başlangıç noktasına dönüş başlatıldı.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrol Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Drone'u belirli bir konuma gönder
    droneKonumaGit: function(enlem, boylam, yükseklik) {
        $.ajax({
            url: '/api/drone/konum_git',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                enlem: parseFloat(enlem),
                boylam: parseFloat(boylam),
                yükseklik: yükseklik ? parseFloat(yükseklik) : undefined
            }),
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrolü', 'Konuma gidiş başlatıldı.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Drone Kontrol Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Drone hızını ayarla
    droneHızAyarla: function(hız) {
        $.ajax({
            url: '/api/drone/hız_ayarla',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                hız: parseFloat(hız)
            }),
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Ayarları', `Drone hızı ${hız}m/s olarak ayarlandı.`);
                }
            }
        });
    },
    
    // Drone yüksekliğini ayarla
    droneYükseklikAyarla: function(yükseklik) {
        $.ajax({
            url: '/api/drone/yükseklik_ayarla',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                yükseklik: parseFloat(yükseklik)
            }),
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Drone Ayarları', `Drone yüksekliği ${yükseklik}m olarak ayarlandı.`);
                }
            }
        });
    },
    
    // Tarama başlat
    taramaşlat: function(kuzeyBatı, güneyDoğu, mesafe, yükseklik) {
        $.ajax({
            url: '/api/tarama/başlat',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                kuzey_batı: kuzeyBatı,
                güney_doğu: güneyDoğu,
                mesafe: mesafe,
                yükseklik: yükseklik
            }),
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Tarama', 'Alan taraması başlatıldı.');
                } else {
                    YağKaçağıUygulaması.bildirimGöster('Tarama Hatası', cevap.mesaj);
                }
            }
        });
    },
    
    // Tarama iptal et
    taramaİptalEt: function() {
        $.ajax({
            url: '/api/tarama/iptal',
            type: 'POST',
            success: function(cevap) {
                if (cevap.başarılı) {
                    YağKaçağıUygulaması.bildirimGöster('Tarama', 'Alan taraması iptal edildi.');
                }
            }
        });
    }
};

// Sayfa yüklendiğinde uygulamayı başlat
$(document).ready(function() {
    // Bildirim konteynerini ekle
    $('body').append('<div id="bildirim-konteyner" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1050;"></div>');
    
    // Uygulamayı başlat
    YağKaçağıUygulaması.başlat();
}); 