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
