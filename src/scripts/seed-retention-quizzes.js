import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma.js';

const childQuestions = [
  {
    questionText: 'Di mana habitat asli Harimau Sumatra?',
    optionA: 'Padang pasir',
    optionB: 'Hutan hujan tropis di Sumatra',
    optionC: 'Kutub Utara',
    optionD: 'Lautan bebas',
    correctOption: 'B',
    points: 10,
  },
  {
    questionText: 'Gajah Sumatra mandi lumpur bertujuan untuk apa?',
    optionA: 'Menjaga suhu tubuh tetap dingin dan melindungi kulit dari serangga',
    optionB: 'Agar terlihat jelek',
    optionC: 'Mencari makanan',
    optionD: 'Bermain petak umpet',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Apa yang membantu burung merak jantan menarik perhatian burung betina?',
    optionA: 'Bulu ekor yang panjang dan berwarna-warni indah',
    optionB: 'Paruh yang tajam',
    optionC: 'Suara cicitan kecil',
    optionD: 'Kecepatan lari',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Makanan utama burung rajawali adalah...',
    optionA: 'Rumput',
    optionB: 'Buah-buahan',
    optionC: 'Daging mangsa seperti ikan atau kelinci',
    optionD: 'Daun pohon',
    correctOption: 'C',
    points: 10,
  },
  {
    questionText: 'Berapa jumlah kaki yang dimiliki oleh seekor laba-laba?',
    optionA: '4 kaki',
    optionB: '6 kaki',
    optionC: '8 kaki',
    optionD: '10 kaki',
    correctOption: 'C',
    points: 10,
  },
  {
    questionText: 'Komodo adalah kadal terbesar di dunia. Hewan ini berasal dari negara mana?',
    optionA: 'Indonesia',
    optionB: 'Australia',
    optionC: 'Afrika Selatan',
    optionD: 'Jepang',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Orangutan suka tinggal di atas pohon. Istilah untuk hewan yang hidup di pohon adalah...',
    optionA: 'Akuatik',
    optionB: 'Arboreal',
    optionC: 'Terestrial',
    optionD: 'Amfibi',
    correctOption: 'B',
    points: 10,
  },
  {
    questionText: 'Mengapa gajah memiliki daun telinga yang lebar?',
    optionA: 'Untuk membantu mendinginkan tubuh saat cuaca panas',
    optionB: 'Agar bisa terbang',
    optionC: 'Untuk menyembunyikan wajahnya',
    optionD: 'Supaya bisa mendengar suara dari luar angkasa',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Apa warna belang pada tubuh Harimau Sumatra yang membantunya bersembunyi di rumput?',
    optionA: 'Hitam dan oranye',
    optionB: 'Biru dan putih',
    optionC: 'Hijau dan kuning',
    optionD: 'Merah dan merah muda',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Hewan apa yang terkenal berjalan sangat lambat dan suka memakan daun selada?',
    optionA: 'Kelinci',
    optionB: 'Cheetah',
    optionC: 'Kura-kura',
    optionD: 'Rusa',
    correctOption: 'C',
    points: 10,
  },
];

const teenQuestions = [
  {
    questionText: 'Apa nama ilmiah dari Komodo?',
    optionA: 'Varanus komodoensis',
    optionB: 'Panthera tigris',
    optionC: 'Pongo pygmaeus',
    optionD: 'Panthera leo',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Burung Enggang memiliki paruh yang besar dan kuat. Apa peran ekologis utama burung ini di hutan Kalimantan?',
    optionA: 'Menyebarkan biji buah-buahan untuk meregenerasi hutan',
    optionB: 'Memburu serangga pengganggu',
    optionC: 'Melindungi hewan kecil dari pemangsa',
    optionD: 'Menggemburkan tanah hutan',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Hewan yang menyusui anaknya disebut kelompok hewan...',
    optionA: 'Reptil',
    optionB: 'Mamalia',
    optionC: 'Amfibi',
    optionD: 'Aves',
    correctOption: 'B',
    points: 10,
  },
  {
    questionText: 'Mengapa Harimau Sumatra dikategorikan sebagai satwa kritis (Critically Endangered)?',
    optionA: 'Karena hilangnya habitat hutan dan perburuan liar',
    optionB: 'Karena mereka tidak bisa berkembang biak',
    optionC: 'Karena populasi mangsa terlalu melimpah',
    optionD: 'Karena perubahan iklim di Kutub Utara',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Salah satu ciri khas Orangutan adalah lengannya yang sangat panjang. Keuntungan utama dari adaptasi morfologi ini adalah...',
    optionA: 'Memudahkan mereka berayun dari pohon ke pohon (brakiasi)',
    optionB: 'Membantu mereka berlari lebih cepat di tanah',
    optionC: 'Menangkap mangsa yang terbang',
    optionD: 'Melindungi diri dari gigitan ular',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Fauna Indonesia bagian barat memiliki kemiripan dengan fauna Asia (Asiatis). Manakah di bawah ini yang merupakan contoh hewan Asiatis?',
    optionA: 'Gajah, Harimau, dan Orangutan',
    optionB: 'Kanguru, Cendrawasih, dan Koala',
    optionC: 'Anoa, Babirusa, dan Komodo',
    optionD: 'Burung Maleo dan Kuskus',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Hewan yang aktif mencari makan pada malam hari disebut hewan...',
    optionA: 'Diurnal',
    optionB: 'Nokturnal',
    optionC: 'Herbivora',
    optionD: 'Karnivora',
    correctOption: 'B',
    points: 10,
  },
  {
    questionText: 'Manakah dari pernyataan berikut yang benar mengenai racun/bisa Komodo?',
    optionA: 'Komodo memiliki kelenjar racun di rahang bawah yang dapat menyebabkan syok dan pendarahan pada mangsa',
    optionB: 'Air liur Komodo tidak mengandung bakteri berbahaya',
    optionC: 'Racun komodo berada pada ekornya',
    optionD: 'Komodo tidak berbisa sama sekali',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Apa sebutan untuk pembagian zona fauna di Indonesia yang memisahkan wilayah barat (Asiatis) dan tengah (Peralihan)?',
    optionA: 'Garis Wallace',
    optionB: 'Garis Weber',
    optionC: 'Garis Khatulistiwa',
    optionD: 'Garis Meridian',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Mengapa keanekaragaman hayati (biodiversitas) di hutan hujan tropis Indonesia sangat tinggi?',
    optionA: 'Karena curah hujan tinggi dan sinar matahari melimpah sepanjang tahun',
    optionB: 'Karena tanahnya tandus',
    optionC: 'Karena sedikitnya tumbuhan pengganggu',
    optionD: 'Karena jarang terjadi hujan',
    correctOption: 'A',
    points: 10,
  },
];

const adultQuestions = [
  {
    questionText: 'Gajah Sumatra (Elephas maximus sumatranus) memiliki peran penting sebagai "ecosystem engineer". Apa arti istilah tersebut dalam ekologi hutan hujan?',
    optionA: 'Mereka membuka jalur di hutan lebat dan membantu penyebaran biji pohon besar berkayu keras melalui kotorannya',
    optionB: 'Mereka merusak struktur vegetasi hutan secara destruktif',
    optionC: 'Mereka membangun bendungan air seperti berang-berang',
    optionD: 'Mereka memakan predator untuk mengendalikan rantai makanan',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Dalam taksonomi Orangutan, terdapat tiga spesies yang diakui secara ilmiah. Mana dari kombinasi berikut yang menyajikan tiga spesies tersebut dengan benar?',
    optionA: 'Pongo pygmaeus, Pongo abelii, Pongo tapanuliensis',
    optionB: 'Pongo pygmaeus, Pongo albus, Pongo sumatranus',
    optionC: 'Pongo pygmaeus, Gorilla gorilla, Pan troglodytes',
    optionD: 'Pongo tapanuliensis, Pongo borneo, Pongo sumatrae',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Apa konsekuensi genetik utama dari fragmentasi habitat yang terjadi pada populasi Harimau Sumatra yang terisolasi?',
    optionA: 'Penurunan keragaman genetik akibat inbreeding depression',
    optionB: 'Peningkatan laju mutasi yang menguntungkan',
    optionC: 'Pembentukan subspesies baru secara instan',
    optionD: 'Peningkatan ketahanan terhadap penyakit endemik',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Bagaimana mekanisme adaptasi fisiologis ginjal unta sehingga mereka dapat bertahan hidup tanpa air dalam jangka waktu yang sangat lama?',
    optionA: 'Ginjal unta mampu memekatkan urine secara ekstrem dan meminimalkan ekskresi air',
    optionB: 'Unta menyimpan cadangan air di dalam punuknya yang berisi jaringan lemak',
    optionC: 'Sel darah merah unta berbentuk oval untuk menampung air tawar murni',
    optionD: 'Unta menyerap uap air secara langsung melalui pori-pori kulitnya',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Mengapa penyu hijau (Chelonia mydas) memegang peran krusial dalam ekosistem lamun (seagrass beds)?',
    optionA: 'Mereka memotong lamun sehingga merangsang pertumbuhan tunas baru dan menjaga kesehatan padang lamun',
    optionB: 'Mereka memakan ikan karang kecil untuk mengontrol populasi',
    optionC: 'Cangkang mereka menjadi tempat bertelur bagi teripang',
    optionD: 'Mereka memproduksi nutrisi nitrogen alami lewat lendir cangkangnya',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Keberadaan spesies indikator (indicator species) sangat penting bagi pemantauan ekosistem. Apa yang ditunjukkan oleh keberadaan burung pemangsa (seperti elang) yang sehat di suatu wilayah hutan?',
    optionA: 'Ekosistem tersebut berada pada tingkat trofik atas yang seimbang dan memiliki rantai makanan yang sehat',
    optionB: 'Hutan tersebut memiliki populasi serangga penyerbuk yang kurang',
    optionC: 'Terjadi akumulasi zat kimia berbahaya di tanah',
    optionD: 'Hutan tersebut tidak layak dihuni oleh mamalia kecil',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Penyakit zoonosis adalah penyakit yang ditularkan dari hewan ke manusia atau sebaliknya. Manakah dari patogen berikut yang sering dikaitkan dengan kelelawar sebagai reservoir alami?',
    optionA: 'Lyssavirus (penyebab rabies) dan Coronavirus',
    optionB: 'Plasmodium falciparum',
    optionC: 'Mycobacterium tuberculosis',
    optionD: 'Salmonella enterica',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Di wilayah Kepulauan Wallacea (Peralihan), banyak dijumpai hewan endemik unik seperti Babirusa dan Anoa. Faktor geologis apa yang menyebabkan tingginya endemisitas ini?',
    optionA: 'Kepulauan tersebut secara historis terisolasi dari daratan Asia maupun Australia, sehingga terjadi evolusi terisolasi yang panjang',
    optionB: 'Kepulauan tersebut sering mengalami gempa bumi vulkanik',
    optionC: 'Wilayah tersebut memiliki iklim ekstrem yang mematikan bagi spesies pendatang',
    optionD: 'Adanya jembatan darat purba yang menghubungkan langsung ke Afrika',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Apa fungsi biologis utama dari perilaku "flehmen response" yang ditunjukkan oleh famili Felidae (seperti harimau) saat mengendus area tertentu?',
    optionA: 'Mentransfer feromon ke organ vomeronasal (Jacobson\'s organ) untuk mendeteksi status reproduksi atau keberadaan individu lain',
    optionB: 'Menunjukkan ekspresi agresi kepada musuh di dekatnya',
    optionC: 'Membantu mengeluarkan panas tubuh melalui penguapan air liur',
    optionD: 'Mempersiapkan otot rahang sebelum melakukan gigitan mematikan',
    correctOption: 'A',
    points: 10,
  },
  {
    questionText: 'Upaya konservasi in-situ dan ex-situ merupakan dua metode penyelamatan satwa liar. Manakah di bawah ini yang dikategorikan sebagai tindakan konservasi in-situ yang tepat?',
    optionA: 'Penetapan kawasan Taman Nasional Bukit Barisan Selatan untuk pelindungan badak dan harimau',
    optionB: 'Pemeliharaan Orangutan di pusat rehabilitasi perkotaan',
    optionC: 'Penyimpanan sperma beku satwa langka di bank gen nasional',
    optionD: 'Penangkaran harimau di kebun binatang untuk program pembiakan terkontrol',
    correctOption: 'A',
    points: 10,
  },
];

const quizzesToSeed = [
  // H+7 (RETENTION_1W)
  {
    title: 'Kuis Retensi H+7 (Anak)',
    quizType: 'RETENTION_1W',
    ageCategory: 'CHILD',
    questions: childQuestions,
  },
  {
    title: 'Kuis Retensi H+7 (Remaja)',
    quizType: 'RETENTION_1W',
    ageCategory: 'TEEN',
    questions: teenQuestions,
  },
  {
    title: 'Kuis Retensi H+7 (Dewasa)',
    quizType: 'RETENTION_1W',
    ageCategory: 'ADULT',
    questions: adultQuestions,
  },
  // H+30 (RETENTION_1M)
  {
    title: 'Kuis Retensi H+30 (Anak)',
    quizType: 'RETENTION_1M',
    ageCategory: 'CHILD',
    questions: childQuestions,
  },
  {
    title: 'Kuis Retensi H+30 (Remaja)',
    quizType: 'RETENTION_1M',
    ageCategory: 'TEEN',
    questions: teenQuestions,
  },
  {
    title: 'Kuis Retensi H+30 (Dewasa)',
    quizType: 'RETENTION_1M',
    ageCategory: 'ADULT',
    questions: adultQuestions,
  },
];

async function seed() {
  console.log('🏁 Memulai seeding kuis retensi...');

  try {
    for (const quizDef of quizzesToSeed) {
      const { title, quizType, ageCategory, questions } = quizDef;

      // Cek apakah kuis serupa sudah terdaftar di database
      const existingQuiz = await prisma.quiz.findFirst({
        where: {
          quizType,
          ageCategory,
          scope: 'GLOBAL',
        },
      });

      if (existingQuiz) {
        console.log(`⚠️ Kuis "${title}" (${quizType} - ${ageCategory}) sudah ada di database. Melewati...`);
        continue;
      }

      console.log(`🌱 Membuat kuis: "${title}"...`);
      const createdQuiz = await prisma.quiz.create({
        data: {
          title,
          quizType,
          ageCategory,
          scope: 'GLOBAL',
          questions: {
            create: questions.map((q) => ({
              questionText: q.questionText,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctOption: q.correctOption,
              points: q.points,
            })),
          },
        },
        include: {
          questions: true,
        },
      });

      console.log(`✅ Berhasil membuat kuis "${createdQuiz.title}" dengan ID: ${createdQuiz.id} dan ${createdQuiz.questions.length} soal.`);
    }

    console.log('🎉 Seeding kuis retensi selesai dengan sukses!');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat melakukan seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
