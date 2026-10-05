# Tiket Hadir - Absensi Online Pemrograman Web

Web absensi dengan tampilan tiket. Dosen membuat sesi dan mendapat kode 5 karakter, mahasiswa memasukkan kode itu untuk absen. Data disimpan di cloud (Supabase).

## Struktur file

```
absensi-tiket/
  index.html   -> kerangka halaman
  style.css    -> tampilan
  app.js       -> logika + koneksi Supabase
  README.md    -> panduan ini
```

## Langkah mengerjakan

### 1. Buat project Supabase
1. Buka supabase.com, login (bisa pakai GitHub), klik **New project**.
2. Isi nama project dan password database, pilih region terdekat (Singapore), tunggu sampai siap.

### 2. Buat tabel
Buka **SQL Editor** > **New query**, tempel kode di bawah, lalu **Run**.

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  meeting int not null,
  code text not null unique,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  nim text not null,
  name text not null,
  status text not null check (status in ('Hadir','Izin','Sakit')),
  created_at timestamptz not null default now(),
  unique (session_id, nim)   -- satu NIM hanya bisa absen sekali per sesi
);

alter table sessions enable row level security;
alter table attendances enable row level security;

create policy "baca sesi" on sessions for select using (true);
create policy "buat sesi" on sessions for insert with check (true);
create policy "ubah sesi" on sessions for update using (true);
create policy "baca absen" on attendances for select using (true);
create policy "isi absen" on attendances for insert with check (true);
```

### 3. Ambil URL dan key
**Project Settings > API**: salin **Project URL** dan **anon public key**.

### 4. Isi konfigurasi
Buka `app.js`, ganti tiga baris paling atas: `SUPABASE_URL`, `SUPABASE_KEY`, dan `PIN_DOSEN`.

### 5. Jalankan lokal
- Cara mudah: klik kanan `index.html` > Open with Live Server (ekstensi VS Code).
- Atau buka langsung di browser.

### 6. Uji coba
1. Tab **Saya dosen** > masukkan PIN > **Buat sesi baru**. Kode sesi muncul besar di kanan.
2. Buka tab **Saya mahasiswa** (atau buka di HP), isi kode, NIM, nama, lalu kirim.
3. Kembali ke tab dosen: nama mahasiswa muncul otomatis (refresh tiap 5 detik).
4. Coba absen dengan NIM yang sama: harus ditolak. Coba **Tutup sesi**: absen baru harus ditolak.

### 7. Deploy online (agar bisa diakses semua mahasiswa)
- **Netlify Drop**: buka app.netlify.com/drop, seret folder `absensi-tiket`. Langsung dapat link.
- Alternatif: GitHub Pages atau Vercel.

## Catatan penting untuk laporan
- PIN dosen ada di sisi browser, jadi cukup untuk tugas kuliah, bukan keamanan sungguhan. Untuk versi serius, pakai **Supabase Auth** untuk login dosen dan batasi policy update/insert sessions hanya untuk user yang login.
- Anon key memang boleh tampil di frontend, yang melindungi data adalah policy RLS.

## Ide pengembangan (nilai tambah)
- Login dosen dengan Supabase Auth
- Kode sesi kedaluwarsa otomatis setelah 15 menit
- Rekap per mahasiswa untuk seluruh pertemuan
- Batasi absen berdasarkan lokasi (Geolocation API)
