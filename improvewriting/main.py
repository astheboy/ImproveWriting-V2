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

# Unsplash API를 사용한 이미지 가져오기 (무료 대안)
def get_random_images():
    """
    무료 이미지 서비스에서 랜덤 이미지 2장을 가져옵니다.
    Unsplash API 키가 없으면 기본 이미지를 반환합니다.
    """
    try:
        # 무료 이미지 URL들 (교육용)
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
                "url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
                "alt": "Children playing in a sunny park"
            },
            {
                "url": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop",
                "alt": "Colorful flowers in a spring garden"
            },
            {
                "url": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
                "alt": "Serene lake with mountains in background"
            }
        ]
        
        # 랜덤으로 2개 선택
        selected_images = random.sample(sample_images, 2)
        return selected_images[0], selected_images[1]
        
    except Exception as e:
        print(f"Error fetching images: {e}")
        # 기본 이미지 반환
        return {
            "url": "https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Image+1",
            "alt": "Sample image for creative writing"
        }, {
            "url": "https://via.placeholder.com/800x600/2196F3/FFFFFF?text=Image+2",
            "alt": "Another sample image for inspiration"
        }

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
        
        # AI 영감 생성 (실제 AI API 대신 규칙 기반으로 구현)
        keywords = generate_ai_keywords(words)
        example_sentence = generate_ai_sentence(words, keywords)
        
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

def generate_ai_keywords(words):
    """
    제출된 낱말들을 기반으로 관련 키워드를 생성합니다.
    """
    if not words:
        return ['상상력', '창의성', '이야기', '감정', '자연']
    
    # 간단한 키워드 생성 로직
    base_keywords = ['창의적인', '아름다운', '신비로운', '따뜻한', '평화로운']
    word_related = []
    
    for word in words[:3]:  # 최대 3개까지만 사용
        if word:
            word_related.append(f"{word}같은")
    
    return base_keywords[:3] + word_related

def generate_ai_sentence(words, keywords):
    """
    낱말들과 키워드를 기반으로 예시 문장을 생성합니다.
    """
    if not words:
        return "이미지를 보며 떠오르는 감정과 생각을 자유롭게 표현해보세요."
    
    # 간단한 문장 템플릿
    templates = [
        f"이 {', '.join(words[:2])}를 보니 마치 {random.choice(keywords)} 느낌이 듭니다.",
        f"{words[0] if words else '이미지'}에서 {random.choice(keywords)} 이야기가 시작될 것 같습니다.",
        f"만약 내가 이 {words[0] if words else '장면'}에 있다면, {random.choice(keywords)} 모험을 떠날 것입니다."
    ]
    
    return random.choice(templates)

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
