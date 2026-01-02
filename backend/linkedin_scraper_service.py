"""
LinkedIn Profile Scraper Service
Extracts publicly available information from LinkedIn profiles with user consent.
"""

import httpx
import logging
import re
from typing import Dict, Optional
from bs4 import BeautifulSoup
import json

logger = logging.getLogger(__name__)


class LinkedInScraperService:
    """Service to scrape public LinkedIn profile data"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def _validate_linkedin_url(self, url: str) -> Optional[str]:
        """Validate and normalize LinkedIn profile URL"""
        # Clean the URL
        url = url.strip()
        
        # Add https if missing
        if not url.startswith('http'):
            url = 'https://' + url
        
        # Check if it's a valid LinkedIn profile URL
        linkedin_patterns = [
            r'https?://(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)/?',
            r'https?://(?:www\.)?linkedin\.com/pub/([a-zA-Z0-9_-]+)/?',
        ]
        
        for pattern in linkedin_patterns:
            match = re.match(pattern, url)
            if match:
                username = match.group(1)
                return f"https://www.linkedin.com/in/{username}"
        
        return None
    
    async def scrape_profile(self, linkedin_url: str) -> Dict:
        """
        Scrape publicly available data from a LinkedIn profile.
        Returns extracted profile information.
        """
        try:
            # Validate URL
            normalized_url = self._validate_linkedin_url(linkedin_url)
            if not normalized_url:
                return {
                    "success": False,
                    "error": "Invalid LinkedIn URL. Please provide a valid LinkedIn profile URL (e.g., linkedin.com/in/username)"
                }
            
            logger.info(f"Scraping LinkedIn profile: {normalized_url}")
            
            # Try to fetch the public profile page
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(normalized_url, headers=self.headers)
                
                if response.status_code == 999:
                    # LinkedIn blocks scraping
                    return {
                        "success": False,
                        "error": "LinkedIn has restricted access to this profile. Please try the manual input method instead.",
                        "suggestion": "Copy your profile information manually from LinkedIn"
                    }
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"Could not access profile (Status: {response.status_code}). The profile may be private or the URL may be incorrect."
                    }
                
                html_content = response.text
            
            # Parse the HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract profile data
            profile_data = self._extract_profile_data(soup, normalized_url)
            
            if not profile_data.get('full_name'):
                # Try alternative extraction method using JSON-LD
                profile_data = self._extract_from_json_ld(soup, normalized_url)
            
            if not profile_data.get('full_name'):
                return {
                    "success": False,
                    "error": "Could not extract profile data. The profile may be private or LinkedIn's structure has changed.",
                    "suggestion": "Please use the manual input method to enter your profile data"
                }
            
            return {
                "success": True,
                "profile": profile_data,
                "source_url": normalized_url
            }
            
        except httpx.TimeoutException:
            logger.error("Timeout while scraping LinkedIn profile")
            return {
                "success": False,
                "error": "Request timed out. LinkedIn may be slow or blocking requests."
            }
        except Exception as e:
            logger.error(f"Error scraping LinkedIn profile: {str(e)}")
            return {
                "success": False,
                "error": f"An error occurred while fetching the profile: {str(e)}"
            }
    
    def _extract_profile_data(self, soup: BeautifulSoup, url: str) -> Dict:
        """Extract profile data from HTML using BeautifulSoup"""
        profile = {
            "full_name": "",
            "headline": "",
            "location": "",
            "summary": "",
            "linkedin_url": url,
            "experiences": [],
            "education": [],
            "skills": [],
            "profile_picture": ""
        }
        
        try:
            # Try to find name from various possible locations
            name_selectors = [
                'h1.top-card-layout__title',
                'h1.text-heading-xlarge',
                '.pv-top-card--list li:first-child',
                'title'
            ]
            
            for selector in name_selectors:
                element = soup.select_one(selector)
                if element:
                    name = element.get_text(strip=True)
                    if name and '|' in name:
                        name = name.split('|')[0].strip()
                    if name and ' - ' in name:
                        name = name.split(' - ')[0].strip()
                    if name and 'LinkedIn' not in name:
                        profile['full_name'] = name
                        break
            
            # Headline
            headline_selectors = [
                'h2.top-card-layout__headline',
                '.text-body-medium',
                '.pv-top-card--list li:nth-child(2)'
            ]
            
            for selector in headline_selectors:
                element = soup.select_one(selector)
                if element:
                    headline = element.get_text(strip=True)
                    if headline and len(headline) > 5:
                        profile['headline'] = headline
                        break
            
            # Location
            location_selectors = [
                '.top-card-layout__first-subline',
                '.text-body-small.inline',
                '.pv-top-card--list-bullet li'
            ]
            
            for selector in location_selectors:
                element = soup.select_one(selector)
                if element:
                    location = element.get_text(strip=True)
                    if location and len(location) > 2:
                        profile['location'] = location
                        break
            
            # Summary/About
            summary_selectors = [
                '.core-section-container__content p',
                '.pv-about__summary-text',
                '#about + .pv-profile-section p'
            ]
            
            for selector in summary_selectors:
                element = soup.select_one(selector)
                if element:
                    summary = element.get_text(strip=True)
                    if summary and len(summary) > 20:
                        profile['summary'] = summary
                        break
            
            # Profile picture
            img_selectors = [
                '.top-card-layout__entity-image',
                '.pv-top-card__photo',
                'img.profile-photo'
            ]
            
            for selector in img_selectors:
                element = soup.select_one(selector)
                if element and element.get('src'):
                    profile['profile_picture'] = element.get('src')
                    break
            
            # Experience (basic extraction)
            experience_sections = soup.select('.experience-section li, .pv-experience-section li')
            for exp in experience_sections[:5]:  # Limit to 5 experiences
                title = exp.select_one('.pv-entity__summary-info h3, .experience-item__title')
                company = exp.select_one('.pv-entity__secondary-title, .experience-item__subtitle')
                
                if title:
                    profile['experiences'].append({
                        'title': title.get_text(strip=True),
                        'company': company.get_text(strip=True) if company else '',
                        'duration': '',
                        'description': ''
                    })
            
            # Education
            education_sections = soup.select('.education-section li, .pv-education-section li')
            for edu in education_sections[:3]:  # Limit to 3 education entries
                school = edu.select_one('.pv-entity__school-name, .education-item__school')
                degree = edu.select_one('.pv-entity__degree-name, .education-item__degree')
                
                if school:
                    profile['education'].append({
                        'institution': school.get_text(strip=True),
                        'degree': degree.get_text(strip=True) if degree else '',
                        'year': ''
                    })
            
            # Skills
            skill_elements = soup.select('.skill-category-entity__name, .pv-skill-category-entity__name')
            for skill in skill_elements[:20]:  # Limit to 20 skills
                skill_text = skill.get_text(strip=True)
                if skill_text:
                    profile['skills'].append(skill_text)
            
        except Exception as e:
            logger.error(f"Error extracting profile data: {str(e)}")
        
        return profile
    
    def _extract_from_json_ld(self, soup: BeautifulSoup, url: str) -> Dict:
        """Extract profile data from JSON-LD structured data if available"""
        profile = {
            "full_name": "",
            "headline": "",
            "location": "",
            "summary": "",
            "linkedin_url": url,
            "experiences": [],
            "education": [],
            "skills": [],
            "profile_picture": ""
        }
        
        try:
            # Look for JSON-LD script tags
            script_tags = soup.find_all('script', type='application/ld+json')
            
            for script in script_tags:
                try:
                    data = json.loads(script.string)
                    
                    if isinstance(data, dict):
                        if data.get('@type') == 'Person':
                            profile['full_name'] = data.get('name', '')
                            profile['headline'] = data.get('jobTitle', '')
                            
                            if data.get('address'):
                                addr = data['address']
                                if isinstance(addr, dict):
                                    profile['location'] = addr.get('addressLocality', '')
                                else:
                                    profile['location'] = str(addr)
                            
                            if data.get('image'):
                                profile['profile_picture'] = data['image']
                            
                            if data.get('description'):
                                profile['summary'] = data['description']
                            
                            # Work experience
                            if data.get('worksFor'):
                                works_for = data['worksFor']
                                if isinstance(works_for, list):
                                    for work in works_for:
                                        profile['experiences'].append({
                                            'title': work.get('jobTitle', ''),
                                            'company': work.get('name', ''),
                                            'duration': '',
                                            'description': ''
                                        })
                                elif isinstance(works_for, dict):
                                    profile['experiences'].append({
                                        'title': works_for.get('jobTitle', ''),
                                        'company': works_for.get('name', ''),
                                        'duration': '',
                                        'description': ''
                                    })
                            
                            # Education
                            if data.get('alumniOf'):
                                alumni = data['alumniOf']
                                if isinstance(alumni, list):
                                    for edu in alumni:
                                        profile['education'].append({
                                            'institution': edu.get('name', ''),
                                            'degree': '',
                                            'year': ''
                                        })
                                elif isinstance(alumni, dict):
                                    profile['education'].append({
                                        'institution': alumni.get('name', ''),
                                        'degree': '',
                                        'year': ''
                                    })
                            
                            break
                except json.JSONDecodeError:
                    continue
            
            # Also try to extract from meta tags
            if not profile['full_name']:
                og_title = soup.find('meta', property='og:title')
                if og_title and og_title.get('content'):
                    title = og_title['content']
                    if '|' in title:
                        profile['full_name'] = title.split('|')[0].strip()
                    elif ' - ' in title:
                        profile['full_name'] = title.split(' - ')[0].strip()
            
            if not profile['summary']:
                og_desc = soup.find('meta', property='og:description')
                if og_desc and og_desc.get('content'):
                    profile['summary'] = og_desc['content']
            
            if not profile['profile_picture']:
                og_image = soup.find('meta', property='og:image')
                if og_image and og_image.get('content'):
                    profile['profile_picture'] = og_image['content']
                    
        except Exception as e:
            logger.error(f"Error extracting from JSON-LD: {str(e)}")
        
        return profile


# Initialize service
linkedin_scraper_service = LinkedInScraperService()
