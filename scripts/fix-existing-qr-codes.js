import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import QRCode from 'qrcode';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDaTd8HjylE4w21l0zqyJP2aBf52Frues4",
  authDomain: "improvewritingapp.firebaseapp.com",
  projectId: "improvewritingapp",
  storageBucket: "improvewritingapp.firebasestorage.app",
  messagingSenderId: "952876432551",
  appId: "1:952876432551:web:9a900b5c1f40c805b96f82",
  measurementId: "G-46P9LL4GXJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixExistingQRCodes() {
  try {
    console.log('기존 클래스들의 QR 코드를 수정하는 중...');
    
    const querySnapshot = await getDocs(collection(db, 'classrooms'));
    
    for (const classDoc of querySnapshot.docs) {
      const classId = classDoc.id;
      const classData = classDoc.data();
      
      console.log(`\n처리 중인 클래스: ${classData.className} (ID: ${classId})`);
      console.log(`기존 QR 코드 URL: ${classData.qrCode || 'Not set'}`);
      
      // 올바른 QR URL 생성
      const correctQrUrl = `https://improvewritingapp.web.app/join/${classId}`;
      
      // QR 코드 데이터 URL 생성
      const qrCodeDataUrl = await QRCode.toDataURL(correctQrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1f2937',  // 다크 그레이
          light: '#ffffff' // 화이트
        }
      });
      
      // 클래스 문서 업데이트
      await updateDoc(doc(db, 'classrooms', classId), {
        qrCode: correctQrUrl,
        qrCodeUrl: qrCodeDataUrl
      });
      
      console.log(`✅ 수정 완료: ${correctQrUrl}`);
    }
    
    console.log('\n🎉 모든 클래스의 QR 코드가 성공적으로 수정되었습니다!');
  } catch (error) {
    console.error('QR 코드 수정 중 오류 발생:', error);
  }
}

fixExistingQRCodes();