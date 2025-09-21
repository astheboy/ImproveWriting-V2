# Firebase Cloud Functions for ImproveWriting V2

import json
import random
import time
from firebase_functions import https_fn
from firebase_functions.options import set_global_options, CorsOptions
from firebase_admin import initialize_app, firestore
from flask import jsonify
import requests

# Firebase Admin을 함수 내에서 초기화

# CORS 설정 - 특정 도메인만 허용
cors_options = CorsOptions(
    cors_origins=["https://improvewritingapp.web.app", "https://improvewritingapp.firebaseapp.com"],
    cors_methods=["GET", "POST", "OPTIONS"]
)

set_global_options(max_instances=10)

def get_fallback_images():
    """
    기본 이미지 2개를 반환합니다.
    """
    return {
        "url": "https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Creative+Writing+Image+1",
        "alt": "Sample image 1 for creative writing"
    }, {
        "url": "https://via.placeholder.com/800x600/2196F3/FFFFFF?text=Creative+Writing+Image+2",
        "alt": "Sample image 2 for creative writing"
    }

# Unsplash API를 사용한 이미지 가져오기 (무료 대안)
def get_random_images():
    """
    무료 이미지 서비스에서 랜덤 이미지 2장을 가져옵니다.
    Unsplash API 키가 없으면 기본 이미지를 반환합니다.
    """
    try:
        # 무료 이미지 URL들 (교육용) - 모두 다른 이미지로 구성
        sample_images = [
            {
                "url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
                "alt": "Beautiful mountain landscape with clear sky"
            },
            {
                "url": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
                "alt": "Peaceful forest with sunlight filtering through trees"
            },
            {
                "url": "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop",
                "alt": "Children playing in a sunny park"
            },
            {
                "url": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop",
                "alt": "Colorful flowers in a spring garden"
            },
            {
                "url": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
                "alt": "Serene lake with mountains in background"
            },
            {
                "url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop",
                "alt": "Misty morning in the mountains"
            },
            {
                "url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&ixid=M3w0NjI2NjJ8MHwxfGNvbGxlY3Rpb258MXwxMDcxNzc3NXx8fHx8Mnx8MTY5OTg2NzIwMA",
                "alt": "Ocean waves at sunset"
            },
            {
                "url": "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&h=600&fit=crop",
                "alt": "City lights at night"
            },
            {
                "url": "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop",
                "alt": "Butterfly on flower"
            },
            {
                "url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&rotation=90",
                "alt": "Snow-covered pine trees"
            }
        ]
        
        # 랜덤으로 2개 선택 (중복 방지)
        if len(sample_images) < 2:
            # 이미지가 부족할 경우 기본 이미지 사용
            return get_fallback_images()
        
        selected_images = random.sample(sample_images, 2)
        # 두 이미지가 같은 URL을 가지지 않도록 확인
        while selected_images[0]['url'] == selected_images[1]['url']:
            selected_images = random.sample(sample_images, 2)
        
        return selected_images[0], selected_images[1]
        
    except Exception as e:
        print(f"Error fetching images: {e}")
        # 기본 이미지 반환
        return get_fallback_images()

@https_fn.on_request(cors=cors_options)
def startNewActivity(req: https_fn.Request) -> https_fn.Response:
    """
    새로운 활동을 시작합니다.
    - 클래스 ID를 받아서
    - 랜덤 이미지 2장을 가져와서
    - Firestore에 저장하고
    - 앱 상태를 'images_only'로 변경합니다.
    """
    
    # Firebase Admin 초기화
    try:
        # Firebase Admin SDK 초기화 (이미 초기화된 경우 무시)
        from firebase_admin import credentials
        import firebase_admin
        
        if not firebase_admin._apps:
            initialize_app()
        
        db = firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return https_fn.Response(
            json.dumps({"error": "Firebase initialization failed"}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
    
    # CORS preflight 요청은 Firebase Functions에서 자동 처리됨
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Only POST requests are allowed"}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # 요청 데이터 파싱
        request_data = req.get_json()
        
        if not request_data or 'data' not in request_data:
            return https_fn.Response(
                json.dumps({"error": "Invalid request format"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        data = request_data['data']
        class_id = data.get('classId')
        
        if not class_id:
            return https_fn.Response(
                json.dumps({"error": "classId is required"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Starting new activity for class: {class_id}")
        
        # 랜덤 이미지 2장 가져오기
        image1, image2 = get_random_images()
        
        # Firestore에 이미지 저장
        shared_images_ref = db.collection('classrooms').document(class_id).collection('sharedImages').document('current')
        shared_images_ref.set({
            'url1': image1['url'],
            'alt1': image1['alt'],
            'url2': image2['url'],
            'alt2': image2['alt'],
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # 앱 상태를 'images_only'로 변경
        app_state_ref = db.collection('classrooms').document(class_id).collection('appState').document('current')
        app_state_ref.set({
            'currentPhase': 'images_only',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"Activity started successfully for class: {class_id}")
        
        # 성공 응답
        response_data = {
            'data': {
                'success': True,
                'message': 'New activity started successfully',
                'images': {
                    'image1': image1,
                    'image2': image2
                },
                'currentPhase': 'images_only'
            }
        }
        
        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except Exception as e:
        print(f"Error in startNewActivity: {str(e)}")
        error_response = {
            'error': {
                'message': f'Internal server error: {str(e)}',
                'code': 'internal'
            }
        }
        return https_fn.Response(
            json.dumps(error_response),
            status=500,
            headers={'Content-Type': 'application/json'}
        )

@https_fn.on_request(cors=cors_options)
def generateImages(req: https_fn.Request) -> https_fn.Response:
    """
    이미지를 재생성합니다.
    - 클래스 ID를 받아서
    - 새로운 랜덤 이미지 2장을 가져와서
    - Firestore에 업데이트합니다.
    """
    
    # Firebase Admin 초기화
    try:
        # Firebase Admin SDK 초기화 (이미 초기화된 경우 무시)
        from firebase_admin import credentials
        import firebase_admin
        
        if not firebase_admin._apps:
            initialize_app()
        
        db = firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return https_fn.Response(
            json.dumps({"error": "Firebase initialization failed"}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
    
    # CORS preflight 요청은 Firebase Functions에서 자동 처리됨
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Only POST requests are allowed"}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # 요청 데이터 파싱
        request_data = req.get_json()
        
        if not request_data or 'data' not in request_data:
            return https_fn.Response(
                json.dumps({"error": "Invalid request format"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        data = request_data['data']
        class_id = data.get('classId')
        
        if not class_id:
            return https_fn.Response(
                json.dumps({"error": "classId is required"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Regenerating images for class: {class_id}")
        
        # 새로운 랜덤 이미지 2장 가져오기
        image1, image2 = get_random_images()
        
        # Firestore에 새 이미지 업데이트
        shared_images_ref = db.collection('classrooms').document(class_id).collection('sharedImages').document('current')
        shared_images_ref.update({
            'url1': image1['url'],
            'alt1': image1['alt'],
            'url2': image2['url'],
            'alt2': image2['alt'],
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"Images regenerated successfully for class: {class_id}")
        
        # 성공 응답
        response_data = {
            'data': {
                'success': True,
                'message': 'Images regenerated successfully',
                'images': {
                    'image1': image1,
                    'image2': image2
                }
            }
        }
        
        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except Exception as e:
        print(f"Error in generateImages: {str(e)}")
        error_response = {
            'error': {
                'message': f'Internal server error: {str(e)}',
                'code': 'internal'
            }
        }
        return https_fn.Response(
            json.dumps(error_response),
            status=500,
            headers={'Content-Type': 'application/json'}
        )

@https_fn.on_request(cors=cors_options)
def startNewActivityForLesson(req: https_fn.Request) -> https_fn.Response:
    """
    레슨용 새로운 활동을 시작합니다.
    - 레슨 ID를 받아서
    - 랜덤 이미지 2장을 가져와서
    - lessons/{lessonId}/sharedImages/current에 저장합니다.
    """
    
    # Firebase Admin 초기화
    try:
        from firebase_admin import credentials
        import firebase_admin
        
        if not firebase_admin._apps:
            initialize_app()
        
        db = firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return https_fn.Response(
            json.dumps({"error": "Firebase initialization failed"}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Only POST requests are allowed"}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # 요청 데이터 파싱
        request_data = req.get_json()
        
        if not request_data or 'data' not in request_data:
            return https_fn.Response(
                json.dumps({"error": "Invalid request format"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        data = request_data['data']
        lesson_id = data.get('lessonId')
        
        if not lesson_id:
            return https_fn.Response(
                json.dumps({"error": "lessonId is required"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Starting new activity for lesson: {lesson_id}")
        
        # 랜덤 이미지 2장 가져오기
        image1, image2 = get_random_images()
        
        # Firestore에 이미지 저장 (lessons 컬렉션 사용)
        shared_images_ref = db.collection('lessons').document(lesson_id).collection('sharedImages').document('current')
        shared_images_ref.set({
            'url1': image1['url'],
            'alt1': image1['alt'],
            'url2': image2['url'],
            'alt2': image2['alt'],
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"Activity started successfully for lesson: {lesson_id}")
        
        # 성공 응답
        response_data = {
            'data': {
                'success': True,
                'message': 'New lesson activity started successfully',
                'images': {
                    'image1': image1,
                    'image2': image2
                }
            }
        }
        
        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except Exception as e:
        print(f"Error in startNewActivityForLesson: {str(e)}")
        error_response = {
            'error': {
                'message': f'Internal server error: {str(e)}',
                'code': 'internal'
            }
        }
        return https_fn.Response(
            json.dumps(error_response),
            status=500,
            headers={'Content-Type': 'application/json'}
        )

@https_fn.on_request(cors=cors_options)
def getAiInspirationForLesson(req: https_fn.Request) -> https_fn.Response:
    """
    레슨을 위한 AI 영감을 생성합니다.
    - 레슨 ID를 받아서
    - 현재 제출된 낱말들을 분석하여
    - AI가 생성한 키워드와 예시 문장을 제공합니다.
    """
    
    # Firebase Admin 초기화
    try:
        from firebase_admin import credentials
        import firebase_admin
        
        if not firebase_admin._apps:
            initialize_app()
        
        db = firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return https_fn.Response(
            json.dumps({"error": "Firebase initialization failed"}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Only POST requests are allowed"}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # 요청 데이터 파싱
        request_data = req.get_json()
        
        if not request_data or 'data' not in request_data:
            return https_fn.Response(
                json.dumps({"error": "Invalid request format"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        data = request_data['data']
        lesson_id = data.get('lessonId')
        
        if not lesson_id:
            return https_fn.Response(
                json.dumps({"error": "lessonId is required"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Getting AI inspiration for lesson: {lesson_id}")
        
        # 현재 제출된 낱말들 가져오기
        words_ref = db.collection('lessons').document(lesson_id).collection('words')
        words_docs = words_ref.stream()
        words = [doc.to_dict().get('text', '') for doc in words_docs]
        
        # 현재 이미지 정보 가져오기
        shared_images_ref = db.collection('lessons').document(lesson_id).collection('sharedImages').document('current')
        images_doc = shared_images_ref.get()
        image_descriptions = []
        
        if images_doc.exists():
            image_data = images_doc.to_dict()
            image_descriptions = [
                image_data.get('alt1', ''),
                image_data.get('alt2', '')
            ]
        
        # AI 영감 생성 (이미지 설명과 제출된 낱말들을 둘 다 고려)
        keywords = generate_ai_keywords(words, image_descriptions)
        example_sentence = generate_ai_sentence(words, keywords, image_descriptions)
        
        # AI 도우미 데이터를 Firestore에 저장
        ai_helper_ref = db.collection('lessons').document(lesson_id).collection('aiHelper').document('current')
        ai_content = {
            'keywords': keywords,
            'exampleSentence': example_sentence
        }
        
        ai_helper_ref.set({
            'content': json.dumps(ai_content, ensure_ascii=False),
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"AI inspiration generated for lesson: {lesson_id}")
        
        # 성공 응답
        response_data = {
            'data': {
                'success': True,
                'message': 'AI inspiration generated successfully',
                'content': ai_content
            }
        }
        
        return https_fn.Response(
            json.dumps(response_data, ensure_ascii=False),
            status=200,
            headers={'Content-Type': 'application/json; charset=utf-8'}
        )
        
    except Exception as e:
        print(f"Error in getAiInspirationForLesson: {str(e)}")
        error_response = {
            'error': {
                'message': f'Internal server error: {str(e)}',
                'code': 'internal'
            }
        }
        return https_fn.Response(
            json.dumps(error_response),
            status=500,
            headers={'Content-Type': 'application/json'}
        )

def generate_ai_keywords(words, image_descriptions=None):
    """
    이미지 설명과 제출된 낱말들을 기반으로 관련 키워드를 생성합니다.
    """
    keywords = []
    
    # 1. 이미지 설명 기반 키워드 추출
    if image_descriptions:
        image_keywords = []
        for desc in image_descriptions:
            if desc:
                desc_lower = desc.lower()
                # 자연 관련 단어 추출
                if any(word in desc_lower for word in ['mountain', 'landscape', '산', '풍경']):
                    image_keywords.extend(['높이', '웅장한', '고요한'])
                if any(word in desc_lower for word in ['forest', 'tree', '나무', '숲']):
                    image_keywords.extend(['생명력', '초록색', '신선한'])
                if any(word in desc_lower for word in ['child', 'play', '아이', '놀이']):
                    image_keywords.extend(['즐거운', '활기찬', '순수한'])
                if any(word in desc_lower for word in ['flower', 'garden', '꽃', '정원']):
                    image_keywords.extend(['화려한', '예쁜', '향기로운'])
                if any(word in desc_lower for word in ['lake', 'water', '물', '호수']):
                    image_keywords.extend(['맑은', '서늘한', '평화로운'])
                if any(word in desc_lower for word in ['sun', 'light', '햇빛', '빛']):
                    image_keywords.extend(['밝은', '따뜻한', '찬란한'])
        
        keywords.extend(list(set(image_keywords))[:4])  # 중복 제거 후 최대 4개
    
    # 2. 제출된 낱말 기반 키워드
    if words:
        for word in words[:2]:  # 최대 2개
            if word:
                keywords.append(f"{word}같은")
    
    # 3. 기본 키워드 (다른 키워드가 부족할 때)
    base_keywords = ['창의적인', '아름다운', '신비로운', '따뜻한', '평화로운']
    while len(keywords) < 5:
        keywords.append(base_keywords[len(keywords) % len(base_keywords)])
    
    return keywords[:6]  # 최대 6개 반환

def generate_ai_sentence(words, keywords, image_descriptions=None):
    """
    이미지 설명, 낱말들, 키워드를 기반으로 예시 문장을 생성합니다.
    """
    # 이미진 설명에서 주요 요소 추출
    image_elements = []
    if image_descriptions:
        for desc in image_descriptions:
            if desc:
                desc_lower = desc.lower()
                if any(word in desc_lower for word in ['mountain', '산']):
                    image_elements.append('산')
                elif any(word in desc_lower for word in ['forest', 'tree', '나무']):
                    image_elements.append('숲')
                elif any(word in desc_lower for word in ['child', 'play', '아이']):
                    image_elements.append('아이들')
                elif any(word in desc_lower for word in ['flower', 'garden', '꽃']):
                    image_elements.append('꽃밭')
                elif any(word in desc_lower for word in ['lake', 'water', '물']):
                    image_elements.append('물가')
    
    # 문장 템플릿 선택
    if not words and not image_elements:
        return "이미지를 보며 떠오르는 감정과 생각을 자유롭게 표현해보세요."
    
    # 이미지와 낱말을 결합한 다양한 템플릿
    templates = []
    
    if image_elements and words:
        # 이미지 + 낱말 + 키워드
        templates.extend([
            f"{image_elements[0]}에서 {words[0]}을(를) 발견한 순간, {random.choice(keywords)} 마음이 들었습니다.",
            f"{random.choice(keywords)} {image_elements[0]}에서 {', '.join(words[:2])}이(가) 춤추고 있는 것 같아요.",
            f"만약 내가 이 {image_elements[0]}에 있다면, {words[0]}과 함께 {random.choice(keywords)} 시간을 보내고 싶어요."
        ])
    elif image_elements:
        # 이미지 + 키워드
        templates.extend([
            f"이 {image_elements[0]}를 보면 {random.choice(keywords)} 느낌이 듭니다.",
            f"{random.choice(keywords)} {image_elements[0]}에서 어떤 이야기가 펼쳐질까요?",
            f"{image_elements[0]} 속에서 {random.choice(keywords)} 모험을 상상해보세요."
        ])
    elif words:
        # 낱말 + 키워드
        templates.extend([
            f"이 {', '.join(words[:2])}를 보니 {random.choice(keywords)} 느낌이 듭니다.",
            f"{words[0] if words else '이미지'}에서 {random.choice(keywords)} 이야기가 시작될 것 같습니다."
        ])
    
    if templates:
        return random.choice(templates)
    else:
        return "이미지를 보며 떠오르는 감정과 생각을 자유롭게 표현해보세요."

@https_fn.on_request(cors=cors_options)
def getAiInspiration(req: https_fn.Request) -> https_fn.Response:
    """
    클래스를 위한 AI 영감을 생성합니다.
    - 클래스 ID를 받아서
    - 현재 제출된 낱말들을 분석하여
    - AI가 생성한 키워드와 예시 문장을 제공합니다.
    """
    
    # Firebase Admin 초기화
    try:
        from firebase_admin import credentials
        import firebase_admin
        
        if not firebase_admin._apps:
            initialize_app()
        
        db = firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return https_fn.Response(
            json.dumps({"error": "Firebase initialization failed"}),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Only POST requests are allowed"}),
            status=405,
            headers={'Content-Type': 'application/json'}
        )
    
    try:
        # 요청 데이터 파싱
        request_data = req.get_json()
        
        if not request_data or 'data' not in request_data:
            return https_fn.Response(
                json.dumps({"error": "Invalid request format"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        data = request_data['data']
        class_id = data.get('classId')
        
        if not class_id:
            return https_fn.Response(
                json.dumps({"error": "classId is required"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        print(f"Getting AI inspiration for class: {class_id}")
        
        # 현재 제출된 낱말들 가져오기 (classrooms 컬렉션 사용)
        words_ref = db.collection('classrooms').document(class_id).collection('words')
        words_docs = words_ref.stream()
        words = [doc.to_dict().get('text', '') for doc in words_docs]
        
        # AI 영감 생성 (실제 AI API 대신 규칙 기반으로 구현)
        keywords = generate_ai_keywords(words)
        example_sentence = generate_ai_sentence(words, keywords)
        
        # AI 도우미 데이터를 Firestore에 저장
        ai_helper_ref = db.collection('classrooms').document(class_id).collection('aiHelper').document('current')
        ai_content = {
            'keywords': keywords,
            'exampleSentence': example_sentence
        }
        
        ai_helper_ref.set({
            'content': json.dumps(ai_content, ensure_ascii=False),
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"AI inspiration generated for class: {class_id}")
        
        # 성공 응답
        response_data = {
            'data': {
                'success': True,
                'message': 'AI inspiration generated successfully',
                'content': ai_content
            }
        }
        
        return https_fn.Response(
            json.dumps(response_data, ensure_ascii=False),
            status=200,
            headers={'Content-Type': 'application/json; charset=utf-8'}
        )
        
    except Exception as e:
        print(f"Error in getAiInspiration: {str(e)}")
        error_response = {
            'error': {
                'message': f'Internal server error: {str(e)}',
                'code': 'internal'
            }
        }
        return https_fn.Response(
            json.dumps(error_response),
            status=500,
            headers={'Content-Type': 'application/json'}
        )
