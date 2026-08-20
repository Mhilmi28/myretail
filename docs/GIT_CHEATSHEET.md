# Git Cheat Sheet — myretail

Kumpulan perintah Git yang paling sering dipakai selama kerja project ini, lengkap dengan penjelasannya.

---

## 1. Perintah Dasar (dipakai hampir tiap hari)

### `git status`
Menampilkan kondisi terkini folder project kamu — file mana yang berubah, mana yang belum di-`add`, mana yang siap di-commit. **Ini perintah paling sering dipakai** buat cek "posisi" kamu sebelum melakukan apapun.
```bash
git status
```

### `git add .`
Menandai (staging) **semua** file yang berubah supaya siap di-commit. Titik (`.`) artinya "semua file di folder ini dan subfoldernya".
```bash
git add .
```
Kalau cuma mau nambahkan 1 file tertentu:
```bash
git add backend/config/database.php
```

### `git commit -m "pesan"`
Menyimpan perubahan yang sudah di-`add` sebagai satu "titik checkpoint" di riwayat project, dengan pesan penjelasan singkat.
```bash
git commit -m "Tambah endpoint login"
```
> Tips: tulis pesan yang jelas & singkat, jelasin APA yang diubah — biar gampang ditelusuri nanti.

### `git push`
Mengirim commit dari komputer kamu ke GitHub, supaya temanmu juga bisa lihat/ambil perubahan itu.
```bash
git push
```
> Kalau ini pertama kali push branch baru, perlu versi lengkap: `git push -u origin nama-branch`

### `git pull`
Mengambil perubahan terbaru dari GitHub ke komputer kamu. **Selalu jalankan ini sebelum mulai kerja**, supaya kamu gak ketinggalan update dari temanmu.
```bash
git pull
```

---

## 2. Branch (buat kerja paralel tanpa saling ganggu)

### `git branch`
Menampilkan daftar branch yang ada di komputer kamu, dan menandai branch mana yang lagi aktif (ditandai `*`).
```bash
git branch
```

### `git checkout -b nama-branch`
Membuat branch baru **sekaligus** langsung pindah ke branch itu. Paling sering dipakai tiap mau mulai kerjain fitur baru.
```bash
git checkout -b backend/auth
```
> Format nama branch yang kita sepakati: `backend/nama-fitur` atau `frontend/nama-fitur`

### `git checkout nama-branch`
Pindah ke branch yang **sudah ada** (tanpa bikin baru).
```bash
git checkout main
```

### `git branch -M main`
Mengganti nama branch aktif jadi `main` (dipakai sekali di awal setup project, jarang dipakai lagi setelahnya).

---

## 3. Melihat Riwayat & Perubahan

### `git log`
Menampilkan riwayat commit — siapa yang commit, kapan, dan pesan commit-nya apa.
```bash
git log
```
Versi ringkas (1 baris per commit, lebih gampang dibaca):
```bash
git log --oneline
```

### `git diff`
Menampilkan **detail perubahan** (baris mana yang ditambah/dihapus) di file yang belum di-`add`. Berguna buat cek ulang sebelum commit.
```bash
git diff
```

---

## 4. Sinkronisasi & Gabung Kerjaan (Merge)

### `git merge nama-branch`
Menggabungkan isi `nama-branch` ke branch yang sedang aktif. Biasanya ini dilakukan otomatis lewat tombol "Merge" di Pull Request GitHub, jarang dijalankan manual dari terminal.
```bash
git merge backend/auth
```

### `git pull origin main --allow-unrelated-histories`
Versi khusus `git pull`, dipakai kalau riwayat Git di lokal dan remote gak nyambung sama sekali (biasanya cuma dipakai sekali, situasi khusus — seperti yang kita alami waktu setup awal project).

---

## 5. Melihat Koneksi ke Remote (GitHub)

### `git remote -v`
Menampilkan remote (link GitHub) mana yang terhubung ke project kamu.
```bash
git remote -v
```

### `git ls-remote <url>`
Mengecek branch apa saja yang ada di sebuah repo GitHub, tanpa perlu clone dulu. Berguna buat cek apakah repo masih kosong atau nggak.
```bash
git ls-remote https://github.com/Mhilmi28/myretail.git
```

---

## 6. Alur Kerja Standar (Ringkasan)

Ini urutan yang bakal sering kamu ulang tiap mau ngerjain fitur baru:

```bash
# 1. Pastikan main kamu up-to-date
git checkout main
git pull

# 2. Bikin branch baru buat fitur yang mau dikerjain
git checkout -b backend/nama-fitur

# 3. ...ngoding seperti biasa...

# 4. Cek perubahan yang sudah dibuat
git status

# 5. Simpan perubahan
git add .
git commit -m "Penjelasan singkat perubahan"

# 6. Push branch ini ke GitHub (pertama kali pakai -u)
git push -u origin backend/nama-fitur

# 7. Buka GitHub, buat Pull Request, minta temanmu review, lalu merge ke main
```

---

## 7. Istilah Singkat (buat referensi cepat)

| Istilah | Arti |
|---|---|
| **Repository (repo)** | Folder project yang di-track Git |
| **Commit** | Satu "titik checkpoint" perubahan, dengan pesan penjelasan |
| **Branch** | Jalur kerja terpisah, supaya gak saling ganggu dengan kerjaan orang lain |
| **Remote** | Server tempat repo disimpan online (misal GitHub), biasa dikasih nama `origin` |
| **Push** | Kirim commit dari komputer ke remote (GitHub) |
| **Pull** | Ambil commit terbaru dari remote (GitHub) ke komputer |
| **Merge** | Menggabungkan isi 1 branch ke branch lain |
| **Staging** | Proses "menandai" file siap di-commit (lewat `git add`) |
| **Pull Request (PR)** | Ajuan di GitHub untuk menggabungkan branch ke branch lain, biasanya lewat review dulu |

---

*Simpan file ini di `docs/GIT_CHEATSHEET.md` untuk referensi cepat kapan pun butuh.*
