// ====== KONFIGURASI (isi dari dashboard Supabase > Project Settings > API) ======
const SUPABASE_URL = "https://jrqvodpkjneixcagjufi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycXZvZHBram5laXhjYWdqdWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzk0OTMsImV4cCI6MjEwNjc1NTQ5M30.OguT0hd6y2UJjuqliCZu8r7TQ2uXe-DBET9GLrVV7sY";
const PIN_DOSEN = "1234"; // ganti sesuka kamu
// ================================================================================

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
let sesiAktif = null;
let timer = null;

function pesan(el, teks, tipe) {
  el.textContent = teks;
  el.className = "msg " + (tipe || "");
}

/* ---------- Tab ---------- */
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t));
    $("mhs").hidden = t.dataset.tab !== "mhs";
    $("dsn").hidden = t.dataset.tab !== "dsn";
  })
);

/* ---------- Mahasiswa ---------- */
$("formAbsen").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("msgMhs");
  const kode = $("kode").value.trim().toUpperCase();
  pesan(msg, "Memeriksa kode sesi...");

  const { data: sesi, error: e1 } = await db.from("sessions").select("*").eq("code", kode).maybeSingle();
  if (e1) return pesan(msg, "Gagal terhubung ke database. Cek konfigurasi Supabase.", "err");
  if (!sesi) return pesan(msg, "Kode sesi tidak ditemukan. Minta kode terbaru ke dosen.", "err");
  if (!sesi.is_open) return pesan(msg, "Sesi ini sudah ditutup oleh dosen.", "err");

  const { error } = await db.from("attendances").insert({
    session_id: sesi.id,
    nim: $("nim").value.trim(),
    name: $("nama").value.trim(),
    status: document.querySelector("input[name=status]:checked").value,
  });
  if (error) {
    return error.code === "23505"
      ? pesan(msg, "NIM ini sudah tercatat di sesi tersebut.", "err")
      : pesan(msg, "Gagal menyimpan: " + error.message, "err");
  }
  pesan(msg, `Tercatat untuk ${sesi.course}, pertemuan ${sesi.meeting}. Terima kasih!`, "ok");
  $("formAbsen").reset();
});

/* ---------- Dosen: login ---------- */
function masukDosen() {
  $("formPin").hidden = true;
  $("dosenArea").hidden = false;
  muatSesi();
}
if (sessionStorage.getItem("dosen") === "1") masukDosen();

$("formPin").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("pin").value === PIN_DOSEN) {
    sessionStorage.setItem("dosen", "1");
    masukDosen();
  } else pesan($("msgPin"), "PIN salah. Coba lagi.", "err");
});

/* ---------- Dosen: sesi ---------- */
function acakKode() {
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => huruf[Math.floor(Math.random() * huruf.length)]).join("");
}

$("formSesi").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data, error } = await db
    .from("sessions")
    .insert({ course: $("mk").value.trim(), meeting: Number($("pert").value), code: acakKode() })
    .select()
    .single();
  if (error) return alert("Gagal membuat sesi: " + error.message);
  await muatSesi();
  pilihSesi(data.id);
});

async function muatSesi() {
  const { data, error } = await db.from("sessions").select("*").order("created_at", { ascending: false });
  const ul = $("listSesi");
  ul.innerHTML = "";
  if (error) return (ul.textContent = "Gagal memuat sesi.");
  if (!data.length) return (ul.textContent = "Belum ada sesi. Buat sesi pertamamu.");
  data.forEach((s) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.dataset.id = s.id;
    b.className = sesiAktif && sesiAktif.id === s.id ? "on" : "";
    b.innerHTML = `Pertemuan ${s.meeting} <small>${s.course} - ${s.is_open ? "dibuka" : "ditutup"}</small>`;
    b.onclick = () => pilihSesi(s.id);
    li.appendChild(b);
    ul.appendChild(li);
  });
}

async function pilihSesi(id) {
  const { data } = await db.from("sessions").select("*").eq("id", id).single();
  sesiAktif = data;
  document.querySelectorAll(".sesi-list button").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
  $("rekapKosong").hidden = true;
  $("rekap").hidden = false;
  $("rkJudul").textContent = `${data.course} - Pertemuan ${data.meeting}`;
  $("rkKode").textContent = data.code;
  $("btnToggle").textContent = data.is_open ? "Tutup sesi" : "Buka lagi";
  muatRekap();
  clearInterval(timer);
  timer = setInterval(muatRekap, 5000); // refresh otomatis tiap 5 detik
}

async function muatRekap() {
  if (!sesiAktif) return;
  const { data, error } = await db
    .from("attendances").select("*").eq("session_id", sesiAktif.id).order("created_at");
  if (error) return;
  $("rkTotal").textContent = `${data.length} mahasiswa tercatat`;
  $("rkBody").innerHTML = data
    .map((a) => `<tr><td>${esc(a.nim)}</td><td>${esc(a.name)}</td>
      <td class="st ${a.status}">${a.status}</td>
      <td>${new Date(a.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td></tr>`)
    .join("");
  sesiAktif._rows = data;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("btnToggle").addEventListener("click", async () => {
  await db.from("sessions").update({ is_open: !sesiAktif.is_open }).eq("id", sesiAktif.id);
  await muatSesi();
  pilihSesi(sesiAktif.id);
});

$("btnCsv").addEventListener("click", () => {
  const rows = sesiAktif._rows || [];
  const csv = ["NIM,Nama,Status,Waktu", ...rows.map((r) => `"${r.nim}","${r.name}",${r.status},${r.created_at}`)].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `absensi-pertemuan-${sesiAktif.meeting}.csv`;
  a.click();
});
