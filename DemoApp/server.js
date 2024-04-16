var express = require("express");
var bodyParser = require("body-parser");
var app = express(); //reference Variabel
var http = require("http").Server(app);
var io = require("socket.io")(http);
var mongoose = require("mongoose");

// Menggunakan middleware untuk menyediakan file statis dan parsing body
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.Promise = Promise;

// URL untuk koneksi MongoDB
var dbUrl =
  "mongodb+srv://Yarr:3do8mLsw68XirBtV@yar.rk8lh8p.mongodb.net/?retryWrites=true&w=majority&appName=Yar";

// Mendefinisikan model Message untuk koleksi 'messages' dalam MongoDB
var Message = mongoose.model("Message", {
  nama: String,
  pesan: String,
});

// Route untuk mendapatkan semua pesan dari database
app.get("/pesan", (req, res) => {
  Message.find({})
    .then((pesan) => {
      res.send(pesan);
    })
    .catch((err) => {
      res.sendStatus(500);
      return console.error(err);
    });
});

// Mendefinisikan model BadWord untuk koleksi 'badwords' dalam MongoDB
const BadWord = mongoose.model("Badword", {
  word: String,
});

// Route untuk menyimpan pesan baru ke dalam database
app.post("/pesan", async (req, res) => {
  try {
    // Mendapatkan daftar badword dari database
    const badWords = await BadWord.find({}).select("word");

    // Deteksi dan penggantian badword pada pesan
    let pesan = req.body.pesan;
    badWords.forEach((badWordObj) => {
      const badWord = badWordObj.word;
      const regex = new RegExp(`\\b(${badWord})\\b`, "gi");
      pesan = pesan.replace(regex, "*".repeat(badWord.length));
    });

    // Deteksi dan penggantian badword pada nama
    let nama = req.body.nama;
    badWords.forEach((badWordObj) => {
      const badWord = badWordObj.word;
      const regex = new RegExp(`\\b(${badWord})\\b`, "gi");
      nama = nama.replace(regex, "*".repeat(badWord.length));
    });

    // Membuat pesan baru dengan nama dan pesan yang telah diproses
    const message = new Message({
      nama: nama, // Menggunakan nama yang telah dicek badword
      pesan: pesan,
    });

    // Menyimpan pesan ke dalam database
    const savedMessage = await message.save();

    // Mengirimkan pesan ke semua klien melalui socket.io
    io.emit("pesan", {
      nama: nama, // Menggunakan nama yang telah dicek badword
      pesan: pesan,
    });

    // Memberi respons status 200 (OK)
    res.sendStatus(200);
  } catch (err) {
    // Jika terjadi kesalahan, memberi respons status 500 (Internal Server Error)
    res.sendStatus(500);
    console.error(err);
  }
});

// Menangani koneksi socket.io
io.on("connection", function (socket) {
  console.log("a user connected");
});

// Menghubungkan ke database MongoDB
mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("Connected to db");
  })
  .catch((err) => {
    console.error(err);
  });

// Menjalankan server HTTP pada port 3000
var server = http.listen(3000, function () {
  console.log("port server adalah", server.address().port);
});
