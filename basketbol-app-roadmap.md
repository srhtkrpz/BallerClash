# 🏀 Sokak Basketbolu Uygulaması — Yol Planı

> İstanbul, Ankara ve İzmir'de sokak basketbolunu organize eden, oyuncu sıralama ve takım yönetimi sistemi sunan bir mobil platform.

| Toplam Süre | Toplam Faz | Platform | Min. Ekip |
|---|---|---|---|
| 12–16 Ay | 5 Faz | iOS + Android | 4–6 Kişi |

---

## Fazlar

### Faz 01 — Araştırma & Planlama
**Süre: 6–8 Hafta**

**Saha Araştırması**
- İstanbul, Ankara, İzmir'de yoğun basketbol oynanan parklar, spor sahaları ve açık alanların haritalanması
- Hedef kitle (18–35 yaş sokak oyuncuları) ile 30+ derinlemesine görüşme
- Rakip ve benzer uygulamaların analizi (Utrip, SportyHQ, vb.)

**Ürün Tanımı**
- User story ve persona oluşturma (Kaptan, Oyuncu, Yeni Başlayan)
- MVP (Minimum Viable Product) kapsamının netleştirilmesi
- Veri modeli taslağı: Kullanıcı, Takım, Maç, Rating, Saha
- Instagram OAuth entegrasyon gereksinimlerinin belirlenmesi

---

### Faz 02 — Tasarım & Prototip
**Süre: 8–10 Hafta**

**UX Tasarım**
- Wireframe: Onboarding, Avatar oluşturma, Takım kurma akışı
- Saha haritası ekranı (bölgeye göre filtreli, oyuncu yoğunluklu)
- Maç daveti, kabul & organizasyon akışı
- Maç sonu reyting & sonuç bildirme ekranları

**UI & Sistem Tasarım**
- Sokak kültürüne uygun marka kimliği ve design system
- Oyuncu profil kartı, avatar editörü tasarımı
- Liderlik tabloları: Oyuncu sıralaması, Bölge şampiyonu, Galibiyet serisi
- Kullanıcı testleri ile prototip doğrulaması

---

### Faz 03 — Backend Geliştirme
**Süre: 10–12 Hafta**

**Temel Altyapı**
- Kimlik doğrulama sistemi (Firebase Auth veya Supabase) + Instagram OAuth
- Kullanıcı, Takım, Maç ve Saha veritabanı şeması (PostgreSQL)
- REST API: Takım CRUD, Maç daveti/kabul endpoints
- Push notification sistemi (FCM) — davet & yanıt bildirimleri

**Özel Sistemler**
- Reyting motoru: Maç bazlı ortalama hesaplama, güncelleme algoritması
- Liderlik tablosu servisi: Bölge sıralaması, galibiyet serisi takibi
- Coğrafi sorgulama: Yakın saha & bölge filtreleme (PostGIS)
- Reyting manipülasyonuna karşı moderasyon kuralları

---

### Faz 04 — Mobil App Geliştirme
**Süre: 12–14 Hafta**

**Temel Özellikler**
- Avatar oluşturma editörü (saç, deri, forma, aksesuar)
- Takım kurma: 4 kişi davet et, kaptan ata, takım adı & logo
- Maç arama ekranı: Bölgeye & tarihe göre filtrelenmiş açık takımlar
- Maç daveti gönderme & kabul akışı → Instagram profil yönlendirmesi

**Sıralama & Sosyal**
- Maç sonu: Kaptan sonuç bildirimi + her oyuncuya 10 üzerinden reyting
- Oyuncu profil sayfası: Ortalama reyting, maç geçmişi, takım bilgisi
- Bölge liderlik tablosu & galibiyet serisi animasyonlu ekranı
- Saha haritası: Canlı oyuncu yoğunluk göstergesi ile interaktif harita

---

### Faz 05 — Lansman & Büyüme
**Süre: 6–8 Hafta**

**Beta & Test**
- Her şehirden 20–30 kişilik kapalı beta grubu ile test
- Reyting sistemi adillik testi ve uç durum senaryoları
- App Store & Google Play başvuruları ve onay süreci
- Yük testi ve performans optimizasyonu

**Büyüme Stratejisi**
- Şehir büyükelçileri: Her sahada uygulama tanıtan yerel oyuncular
- Sosyal medya: TikTok & Instagram reels ile "en iyi oyuncular" içeriği
- İlk turnuva etkinliği: App üzerinden organize edilen açılış maçı serisi
- Geri bildirim döngüsü ve hızlı iterasyon sprinti (2 haftalık)

---

## Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| Mobil Framework | React Native + Expo | Tek kod tabanıyla iOS ve Android. OTA güncellemeler. |
| Backend | Node.js + Supabase | Realtime DB, Auth, Storage ve Edge Functions. PostgreSQL + PostGIS. |
| Harita | Mapbox / Google Maps | Saha lokasyonları, oyuncu yoğunluk ısı haritası ve bölge filtreleme. |
| Sosyal Auth | Instagram OAuth | Kullanıcı doğrulama + maç organizasyonu için profil yönlendirmesi. |
| Bildirimler | Firebase Cloud Messaging | Gerçek zamanlı maç davetleri, kabul bildirimleri ve reyting uyarıları. |
| CI/CD | Expo EAS + GitHub Actions | Otomatik build, test ve store yayınlama pipeline'ı. |

---

## Kritik Riskler

### 🔴 Yüksek Risk

**Reyting Manipülasyonu**
Kaptanların sahte maç sonucu bildirmesi veya oyuncuların birbirlerine anlaşmalı yüksek puan vermesi.
> Çözüm: Çift taraf onayı, anormallik tespiti, kullanıcı şikayet sistemi.

**Instagram API Kısıtlamaları**
Meta'nın Instagram API'si kısıtlıdır. Uygulama içi mesajlaşma yerine yönlendirme yapılması daha güvenli bir strateji.
> Çözüm: Yönlendirme bazlı organizasyon akışı, uygulama içi mesajlaşma yok.

### 🟡 Orta Risk

**Kullanıcı Kitlesi Oluşturma**
Başlangıçta yeterli kullanıcı olmazsa eşleşme bulunamaz.
> Çözüm: Her şehirde çekirdek topluluk oluşturup beta'yı onlarla başlat.

### 🟢 Düşük Risk

**Hava & Saha Koşulları**
Kış aylarında aktivite düşüşü ve saha erişim sorunları.
> Çözüm: Kapalı salonları da sisteme ekle, mevsimsel etkinlikler planla.

---

## Başarı için Tüyolar

**Önce Topluluk, Sonra Teknoloji**
Uygulamayı yazmadan önce WhatsApp grupları ile bir saha pilot testi yap. İnsanların gerçekten sistemi kullanıp kullanmayacağını doğrula.

**MVP'yi Dar Tut**
İlk sürümde sadece İstanbul + 1 saha ile başla. Her özelliği eklemek yerine takım kurma + maç eşleşme + temel reyting yeterli.

**Sıralamayı Rekabetçi Yap**
Haftalık "Bölge Şampiyonu" rozeti, özel profil çerçevesi gibi küçük ödüller uygulamaya bağımlılık yaratır.

**Gerçek Organizasyon Dışarıda Kalsın**
Yer/saat anlaşması Instagram'da olacağından uygulama mesajlaşmaya çalışmamalı. Bu, geliştirmeyi önemli ölçüde basitleştirir.

---

## Zaman Çizelgesi

| Faz | Kapsam | Dönem |
|---|---|---|
| Faz 01–02 | Araştırma & Tasarım | Ay 1–4 |
| Faz 03 | Backend | Ay 3–6 |
| Faz 04 | Mobil Uygulama | Ay 5–9 |
| Faz 05 | Lansman | Ay 10–12 |
| Sonrası | Büyüme & V2 | Ay 12+ |

---

> 🏀 **BallerClash** · Tahmini toplam süre: 12–16 ay · Ekip: 4–6 kişi
