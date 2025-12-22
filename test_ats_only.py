#!/usr/bin/env python3
"""
Test only the ATS Resume Checker endpoint
"""

import requests
import json
import tempfile
import os

# Get backend URL from environment
BACKEND_URL = "https://cvbooster-app.preview.emergentagent.com/api"

def test_ats_resume_checker():
    """Test ATS Resume Checker endpoint (FREE - no authentication required)"""
    print("📄 Testing ATS Resume Checker...")
    
    # Sample resume content from review request
    sample_resume_content = """John Smith
Email: john.smith@email.com
Phone: (555) 123-4567
Location: New York, NY
LinkedIn: linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Experienced software engineer with 5 years of experience in full-stack development.

WORK EXPERIENCE
Senior Software Engineer
ABC Tech Company | Jan 2020 - Present
- Developed web applications using React and Node.js
- Led a team of 3 developers
- Improved application performance by 40%

Software Developer
XYZ Corp | Jun 2018 - Dec 2019
- Built REST APIs using Python and Flask
- Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2018

SKILLS
Python, JavaScript, React, Node.js, SQL, Git, AWS"""
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
            temp_file.write(sample_resume_content)
            temp_file_path = temp_file.name
        
        # Prepare file for upload
        url = f"{BACKEND_URL}/ats-check"
        
        with open(temp_file_path, 'rb') as file:
            files = {'file': ('sample_resume.txt', file, 'text/plain')}
            
            print("Sending request to ATS endpoint...")
            response = requests.post(url, files=files, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                print("✅ ATS Resume Checker - Request successful")
                
                # Validate response structure
                required_fields = ["success", "filename", "analysis"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    print(f"❌ Missing fields: {missing_fields}")
                    return False
                
                print(f"✅ Response structure valid")
                print(f"   Success: {data.get('success')}")
                print(f"   Filename: {data.get('filename')}")
                
                # Validate analysis structure
                analysis = data.get("analysis", {})
                required_analysis_fields = [
                    "overall_score", "summary", "categories", 
                    "checklist", "strengths", "recommendations"
                ]
                missing_analysis_fields = [f for f in required_analysis_fields if f not in analysis]
                
                if missing_analysis_fields:
                    print(f"❌ Missing analysis fields: {missing_analysis_fields}")
                    return False
                
                print(f"✅ Analysis structure valid")
                
                # Validate overall_score
                overall_score = analysis.get("overall_score")
                if not isinstance(overall_score, (int, float)) or not (0 <= overall_score <= 100):
                    print(f"❌ Invalid overall_score: {overall_score}")
                    return False
                
                print(f"✅ Overall Score: {overall_score}/100")
                
                # Validate categories
                categories = analysis.get("categories", {})
                expected_categories = [
                    "format_compatibility", "contact_information", "keywords_skills",
                    "work_experience", "education", "overall_structure"
                ]
                missing_categories = [c for c in expected_categories if c not in categories]
                
                if missing_categories:
                    print(f"❌ Missing categories: {missing_categories}")
                    return False
                
                print(f"✅ Categories: {len(categories)} found")
                for cat, score in categories.items():
                    print(f"   {cat}: {score}")
                
                # Validate arrays
                checklist = analysis.get("checklist", [])
                strengths = analysis.get("strengths", [])
                recommendations = analysis.get("recommendations", [])
                
                print(f"✅ Checklist: {len(checklist)} items")
                print(f"✅ Strengths: {len(strengths)} items")
                print(f"✅ Recommendations: {len(recommendations)} items")
                
                # Print summary
                summary = analysis.get("summary", "")
                print(f"✅ Summary: {summary[:100]}...")
                
                print("\n🎉 ATS Resume Checker test PASSED!")
                return True
                
            else:
                print(f"❌ Request failed with status {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail.get('detail', 'No detail')}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False
    
    except requests.exceptions.Timeout:
        print("❌ Request timeout (60s)")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    finally:
        # Clean up temporary file
        try:
            if 'temp_file_path' in locals():
                os.unlink(temp_file_path)
        except:
            pass
    
    return False

if __name__ == "__main__":
    success = test_ats_resume_checker()
    exit(0 if success else 1)