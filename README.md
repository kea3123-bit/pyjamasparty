# ✦ A Night Under the Stars — Undian Bintang Malam

Laman undian bertema langit malam untuk **Majlis Makan Malam Tahunan SMK Bandar Baru Sungai Lalang**, 26 November 2026, Dewan Al-Sufi. Antara muka sepenuhnya dalam Bahasa Melayu.

## Ciri utama

- Animasi bintang berkelip, bintang jatuh, bulan sabit, ilustrasi bantal/selimut dan poster rasmi.
- **Roda Impian interaktif**: cari dan pilih nama calon, putarkan roda bertema malam berbintang, kemudian tekan **Berikan Bintang** untuk memasukkan pilihan. Roda ialah animasi pilihan pengundi, bukan cabutan rawak; semua calon masih boleh dipilih.
- Pengundi hanya perlu memasukkan **nombor kad pengenalan 12 digit**; pengesahan dibuat menggunakan senarai guru dan AKP pada pelayan.
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

## Seni bina yang betul

**Seluruh UI berada di GitHub Pages.** Calon, animasi, pengesahan pengundi, tiga pilihan, paparan selesai dan leaderboard admin semuanya beroperasi pada halaman [https://kea3123-bit.github.io/pyjamasparty/](https://kea3123-bit.github.io/pyjamasparty/).

Google Apps Script hanyalah **backend sambungan Google Sheets**. Ia menyediakan fail Bridge.html (komponen kecil tanpa UI) dan Code.gs (fungsi server). GitHub Pages berkomunikasi dengan Bridge.html dalam iframe tersembunyi melalui mesej yang disahkan menggunakan origin GitHub dan token saluran rawak. Google Apps Script menggunakan google.script.run untuk membaca/menulis ke Sheets. Nombor KP tidak dimasukkan ke dalam query URL.

## Aktifkan backend Apps Script

> URL backend semasa: [Apps Script /exec](https://script.google.com/macros/s/AKfycbwsfZkaneRyH58UNPqX3RS-igyyItIxbKDvLxigKMlvP6S8j6kgMqPTpxp7wbtze_g5nA/exec). Pautan ini hanya untuk sambungan data, bukan lagi untuk memaparkan laman undian.

1. Buka [Google Sheets database undian](https://docs.google.com/spreadsheets/d/1JTDub0wvhC8O991Gnc0neJdHupONWCM5PO9_T0-mKVw/edit), klik **Extensions → Apps Script**.
2. Gantikan kandungan fail **Code.gs** dalam editor dengan [apps-script/Code.gs](apps-script/Code.gs).
3. Klik **+ → HTML**, namakan fail **Bridge**. Tampal kandungan [apps-script/Bridge.html](apps-script/Bridge.html). Fail Index.html yang lama tidak lagi digunakan; boleh dipadam daripada projek Apps Script jika mahu.
4. Buka **Project Settings → Script properties → Add script property**. Namanya **ADMIN_PASSWORD**, dan nilainya ialah kata laluan pentadbir yang unik, sekurang-kurangnya 12 aksara (16+ disyorkan). **Jangan simpan kata laluan dalam GitHub, HTML atau Google Sheets.**
5. Klik **Deploy → Manage deployments → Edit (ikon pensel)** untuk deployment URL sedia ada, pilih **New version**. Tetapan Web app: **Execute as: Me (pemilik skrip)** supaya pengundi tidak memerlukan akses terus ke Google Sheets; **Who has access** mesti membenarkan pelawat yang ingin mengundi. **Utamakan akses organisasi sekolah** jika semua menggunakan akaun organisasi kerana hanya nombor KP diperlukan untuk pengesahan. Jika iframe di GitHub Pages gagal memuatkan kerana log masuk Google atau sekatan cookies pihak ketiga, semak semula tetapan capaian dengan mengambil kira risiko penyamaran identiti.
6. Klik **Deploy**, benarkan kebenaran kepada dua Google Sheets jika diminta. Pilih **Edit deployment sedia ada**, bukan cipta deployment baru, supaya URL /exec tidak berubah.
7. Buka **GitHub Pages**, tunggu pangkalan data disambungkan. Tab CALON akan terisi automatik dengan **67 individu unik** pada panggilan data pertama. Semak nama/jantina dan status TETAPAN!B2. Anda boleh tukar kepada FALSE sehingga selesai semakan.
8. Edarkan **hanya URL GitHub Pages** sebagai laman undian. Pengundi akan kekal di GitHub Pages ketika mengundi dan menyemak pilihan.

Jika mesej **Sambungan pangkalan data belum aktif** masih dipaparkan, periksa bahawa fail Bridge.html wujud, fungsi doGet dalam Code.gs versi terbaru, deployment Web App telah dikemas kini, dan akaun mempunyai akses. GitHub Pages akan menghalang log masuk pengundi sehingga sambungan berjaya.

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

## Cara pengundi menggunakan Roda Impian

1. Masukkan nombor kad pengenalan 12 digit untuk mengakses undian.
2. Gunakan kategori **Semua / Perempuan / Lelaki** dan kotak carian untuk mencari calon, kemudian pilih nama daripada senarai.
3. Tekan **Putarkan Roda!** dan tunggu sehingga roda berhenti pada nama yang dipilih.
4. Tekan **Berikan Bintang**. Ulang untuk **tiga calon berbeza**; pilihan boleh dibuang sebelum dihantar.
5. Tekan **Sahkan 3 Pilihan** dan sahkan penghantaran terakhir. Roda memaparkan sehingga lapan calon pada satu masa untuk memastikan nama boleh dibaca, tetapi menu pilihan merangkumi semua calon aktif.

## Struktur repo

- **index.html** — keseluruhan laman undian GitHub Pages, termasuk admin dashboard.
- **assets/poster-web.jpg** — poster rasmi yang dibekalkan, dioptimumkan untuk laman web.
- **apps-script/Code.gs** — keselamatan, logik undi, pengesahan serta pangkalan data.
- **apps-script/Bridge.html** — jambatan mesej tersembunyi untuk panggilan pelayan; tiada antaramuka undian.

Antaramuka hanya perlu diubah dalam index.html pada GitHub. Backend hanya perlu dikemas kini apabila fungsi data/pengesahan berubah.

## Privasi

Repositori awam **tidak mengandungi** KP, nombor telefon, kata laluan atau senarai staf penuh. Nombor KP hanya dibandingkan pada server terhadap spreadsheet sumber dan tidak disalin ke Google Sheets undian.

Pengesahan menggunakan KP sahaja memudahkan undian, tetapi **sesiapa yang mengetahui nombor KP seseorang mungkin boleh mengundi bagi pihaknya**. Sangat digalakkan mengehadkan akses aplikasi kepada akaun Workspace organisasi sekolah. Alternatif yang lebih kukuh ialah kod undian unik atau SSO.
