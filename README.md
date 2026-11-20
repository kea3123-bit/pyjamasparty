# ✦ A Night Under the Stars — Undian Bintang Malam

Laman undian bertema langit malam untuk **Majlis Makan Malam Tahunan SMK Bandar Baru Sungai Lalang**, 26 November 2026, Dewan Al-Sufi. Antara muka sepenuhnya dalam Bahasa Melayu.

## Ciri utama

- Animasi bintang berkelip, bintang jatuh, bulan sabit, ilustrasi bantal/selimut dan poster rasmi.
- Pengundi disahkan melalui **12 digit KP + 4 digit terakhir nombor telefon** daripada senarai guru dan AKP di sisi pelayan sahaja.
- Setiap pengundi memilih **tepat 3 calon berbeza**, dan **hanya satu penghantaran undi** dibenarkan.
- Papan keputusan **hanya untuk pentadbir** dan menunjukkan 7 calon perempuan serta 3 calon lelaki teratas.
- Pentadbir boleh buka atau tutup undian; undian dikunci secara transaksi supaya tidak berganda.
- Pangkalan data merekodkan hanya hash pengundi bersalt, tiga ID calon, masa dan status; **tiada nombor KP atau telefon disimpan** dalam helaian undian.

## Dua Google Sheets

| Tujuan | Google Sheets | Tab |
| --- | --- | --- |
| Senarai guru/AKP (rujukan baca sahaja) | [Senarai Nama Guru dan AKP](https://docs.google.com/spreadsheets/d/1YU2UT5BVFJo5JRacTVPXZKyPkOp-Z3DQ-HC5jD7zjf8/edit) | Sheet1 |
| Database undian | [Undian Pyjamas Party](https://docs.google.com/spreadsheets/d/1JTDub0wvhC8O991Gnc0neJdHupONWCM5PO9_T0-mKVw/edit) | UNDI, CALON, TETAPAN |

Lajur sumber Sheet1: BIL, NAMA, NOKP, JAWATAN, NO TELEFON. Semakan awal: **69 baris, 67 individu unik** (dua rekod berulang). Skrip secara automatik menyatukan kedua-dua rekod berulang.

**Penting:** Jantina calon mula-mula ditetapkan menggunakan digit akhir KP (genap = P, ganjil = L). Pentadbir **mesti menyemak dan membetulkannya** dalam lajur C tab CALON kerana kaedah ini tidak 100% tepat. Jangan ubah ID calon dalam lajur A selepas undian bermula.

## Hidupkan undian sebenar melalui Google Apps Script

> Fail index.html di akar repo ialah **pratonton interaktif sahaja**. Undian sebenar mesti dibuka daripada URL aplikasi web Google Apps Script kerana pangkalan data serta pengesahan identiti berada di pelayan.

1. Buka [Google Sheets database undian](https://docs.google.com/spreadsheets/d/1JTDub0wvhC8O991Gnc0neJdHupONWCM5PO9_T0-mKVw/edit), klik **Extensions → Apps Script**.
2. Gantikan kandungan fail **Code.gs** dalam editor dengan [apps-script/Code.gs](apps-script/Code.gs).
3. Klik **+ → HTML** dan namakan fail **Index** (bukan Index.html.html). Tampal kandungan [apps-script/Index.html](apps-script/Index.html).
4. Buka **Project Settings → Script properties → Add script property**. Namanya **ADMIN_PASSWORD**, dan nilainya ialah kata laluan pentadbir yang unik, sekurang-kurangnya 12 aksara (16+ disyorkan). **Jangan simpan kata laluan dalam GitHub, HTML atau Google Sheets.**
5. Klik **Deploy → New deployment → Web app**. Pilih **Execute as: Me (pemilik skrip)** supaya pengundi tidak perlu berkongsi akses pangkalan data. Untuk **Who has access**, gunakan **Anyone within your organisation** jika semua pengundi mempunyai akaun organisasi yang sama; jika tidak, pilih capaian yang sesuai. Jika anda membenarkan Anyone, sesiapa yang mempunyai pautan boleh membuka halaman, tetapi hanya kakitangan dengan KP dan telefon yang sepadan boleh mengundi.
6. Klik **Deploy**, benarkan akses kepada dua Google Sheets dan buka URL yang berakhir dengan **/exec**.
7. Pada bukaan pertama, tab CALON akan terisi secara automatik dengan **67 individu unik**. Semak semua jantina/nama. Status buka undian terletak pada **TETAPAN!B2**; tukar nilai kepada FALSE sementara anda menyemak calon.
8. Edarkan **pautan Apps Script /exec**, bukannya GitHub Pages, untuk undian sebenar.

Selepas kod diubah, pilih **Deploy → Manage deployments → Edit → New version → Deploy**. Hanya simpan fail tidak akan mengubah laman yang telah diterbitkan.

## Struktur tab database

**UNDI**: MASA | HASH_PENGUNDI | PILIHAN_ID | STATUS

**CALON**: ID | NAMA_CALON | JANTINA (P/L) | AKTIF (YA/TIDAK)

**TETAPAN**: voting_open (TRUE/FALSE), max_votes (3), female_winners (7), male_winners (3).

Peraturan 3 undian dan 7/3 pemenang **dikunci dalam kod server**; nilai pada TETAPAN adalah rujukan urus setia kecuali voting_open yang boleh diubah.

## Pentadbir

1. Klik **Log masuk pentadbir** pada bahagian bawah laman sebenar.
2. Masukkan kata laluan yang disimpan dalam Script Properties.
3. Lihat jumlah pengundi, jumlah bintang, top 7 perempuan, top 3 lelaki serta senarai penuh.
4. Butang **Tutup undian / Buka semula undian** mengubah status TETAPAN!B2.

Sekiranya undian seri pada tempat ketujuh atau ketiga, paparan disusun mengikut abjad untuk konsistensi. Urus setia perlu menentukan sendiri kaedah pemutus seri.

## Semakan sebelum majlis

- Semak kategori jantina dan status aktif setiap calon di tab CALON.
- Uji dengan salinan database berasingan untuk **mengelakkan undian percubaan bercampur dengan undian sebenar**.
- Jangan kongsi database Google Sheets secara umum. Hanya urus setia yang dipercayai patut mempunyai akses.
- Pastikan kata laluan admin kuat dan tidak terdedah dalam kod awam.
- Periksa bahawa pengundi biasa tidak dapat mengakses keputusan admin.

## Struktur repo

- **index.html** — pratonton statik GitHub Pages; tidak boleh merekod undian sebenar.
- **assets/poster-web.jpg** — poster rasmi yang dibekalkan, dioptimumkan untuk laman web.
- **apps-script/Code.gs** — keselamatan, logik undi, pengesahan serta pangkalan data.
- **apps-script/Index.html** — laman sebenar yang dijalankan bersama Code.gs.

Fail index.html dan apps-script/Index.html perlu diseragamkan jika rekaan UI ditukar.

## Privasi

Repositori awam **tidak mengandungi** KP, nombor telefon, kata laluan atau senarai staf penuh. Nombor KP hanya dibandingkan pada server terhadap spreadsheet sumber dan tidak disalin ke Google Sheets undian.

Pengesahan KP + empat digit telefon ialah kawalan asas untuk acara dalaman, **bukan pengesahan selamat setaraf SSO**. Jika perlu keselamatan lebih kuat, gunakan Workspace organisasi atau kod undian unik bagi setiap warga sekolah.
