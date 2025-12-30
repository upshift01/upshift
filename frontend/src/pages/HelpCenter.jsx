import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  FileText, Sparkles, Target, Mail, Linkedin, Zap, Briefcase, 
  MessageSquare, Calendar, Search, ChevronDown, ChevronRight,
  Download, BookOpen, HelpCircle, Users, Building2, ExternalLink,
  CheckCircle, Play, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Help content data
const helpSections = {
  'cv-builder': {
    title: 'CV Builder',
    icon: FileText,
    color: '#1e40af',
    description: 'Create professional, ATS-optimised CVs with AI assistance',
    audience: ['customer'],
    steps: [
      {
        title: 'Choose a Template',
        content: 'Start by selecting a template that matches your industry and career level. We offer General templates for versatile use, ATS-Optimised templates that pass Applicant Tracking Systems, and Industry-Specific templates tailored for your field.'
      },
      {
        title: 'Enter Personal Information',
        content: 'Fill in your contact details including full name, email, phone number, and location. You can also add a professional photo, ID/passport number, and languages you speak.'
      },
      {
        title: 'Add Work Experience',
        content: 'Enter your work history with job titles, company names, dates, and descriptions. Use the "AI Enhance" button to automatically improve your descriptions and generate key achievements.'
      },
      {
        title: 'Add Education',
        content: 'Include your educational background with degrees, institutions, and graduation years. Add any relevant certifications or courses.'
      },
      {
        title: 'List Your Skills',
        content: 'Add your technical and soft skills. Use the "Suggest Skills" feature to get AI-powered recommendations based on your experience and target role.'
      },
      {
        title: 'Add References',
        content: 'Include professional references with their contact details. This section is optional but recommended for senior positions.'
      },
      {
        title: 'Generate & Download',
        content: 'Click "Generate & Download CV" to create your professional PDF. Your CV will also be saved to "My Documents" for future editing.'
      }
    ],
    tips: [
      'Use action verbs to start bullet points (e.g., "Managed", "Developed", "Increased")',
      'Quantify achievements with numbers where possible',
      'Keep your CV to 1-2 pages for most roles',
      'Tailor your CV for each job application'
    ]
  },
  'improve-cv': {
    title: 'Improve CV / Resume Enhancer',
    icon: Sparkles,
    color: '#7c3aed',
    description: 'Upload your existing CV and let AI enhance it professionally',
    audience: ['customer'],
    steps: [
      {
        title: 'Upload Your CV',
        content: 'Drag and drop your existing CV (PDF, DOC, or DOCX format) or click to browse. Our AI will extract all the information automatically.'
      },
      {
        title: 'Review Extracted Data',
        content: 'Check the extracted information for accuracy. The AI will identify your personal details, work experience, education, and skills.'
      },
      {
        title: 'AI Enhancement',
        content: 'Click "Enhance with AI" to automatically improve your professional summary, job descriptions, and achievements. The AI will make your content more impactful and ATS-friendly.'
      },
      {
        title: 'Select Template',
        content: 'Choose a new professional template to give your CV a fresh, modern look while keeping your enhanced content.'
      },
      {
        title: 'Download Enhanced CV',
        content: 'Generate and download your improved CV as a professionally formatted PDF.'
      }
    ],
    tips: [
      'Upload a text-based PDF for best extraction results',
      'Review AI suggestions and personalise as needed',
      'Compare before and after versions to see improvements'
    ]
  },
  'ats-checker': {
    title: 'ATS Checker',
    icon: Target,
    color: '#059669',
    description: 'Check if your CV passes Applicant Tracking Systems',
    audience: ['customer'],
    steps: [
      {
        title: 'Upload Your CV',
        content: 'Upload your CV in PDF, DOC, or DOCX format. For best results, use a text-based PDF rather than a scanned image.'
      },
      {
        title: 'Optional: Add Job Description',
        content: 'Paste the job description you\'re applying for to get tailored keyword matching and recommendations.'
      },
      {
        title: 'Get Your Score',
        content: 'Receive an ATS compatibility score out of 100, along with detailed feedback on formatting, keywords, and structure.'
      },
      {
        title: 'Review Recommendations',
        content: 'Read through specific suggestions to improve your CV\'s ATS compatibility, including missing keywords and formatting issues.'
      },
      {
        title: 'Make Improvements',
        content: 'Use our CV Builder or Improve CV tool to implement the recommended changes and re-check your score.'
      }
    ],
    tips: [
      'Aim for a score of 80% or higher',
      'Use standard section headings (Education, Experience, Skills)',
      'Avoid tables, graphics, and unusual fonts',
      'Include keywords from the job description naturally'
    ]
  },
  'cover-letter': {
    title: 'Cover Letter Generator',
    icon: Mail,
    color: '#dc2626',
    description: 'Generate compelling, personalised cover letters with AI',
    audience: ['customer'],
    steps: [
      {
        title: 'Enter Job Details',
        content: 'Provide the job title, company name, and paste the job description. This helps the AI tailor your cover letter.'
      },
      {
        title: 'Add Your Background',
        content: 'Enter your relevant experience, skills, and achievements. You can also upload your CV for automatic extraction.'
      },
      {
        title: 'Choose Tone & Style',
        content: 'Select the tone (Professional, Enthusiastic, Confident) and length (Short, Medium, Long) that suits the role and company culture.'
      },
      {
        title: 'Generate Cover Letter',
        content: 'Click generate to create your AI-powered cover letter. The system will match your experience to the job requirements.'
      },
      {
        title: 'Edit & Personalise',
        content: 'Review and edit the generated letter. Add personal touches and specific examples that showcase your fit for the role.'
      },
      {
        title: 'Download',
        content: 'Download your cover letter as a PDF or copy the text to paste directly into job applications.'
      }
    ],
    tips: [
      'Research the company before generating',
      'Mention specific projects or achievements',
      'Keep it to one page',
      'Address it to a specific person if possible'
    ]
  },
  'linkedin-tools': {
    title: 'LinkedIn Tools',
    icon: Linkedin,
    color: '#0077b5',
    description: 'Optimise your LinkedIn profile for maximum visibility',
    audience: ['customer'],
    steps: [
      {
        title: 'Profile Analyser',
        content: 'Enter your LinkedIn profile URL or paste your current headline and summary. Our AI will analyse it for effectiveness.'
      },
      {
        title: 'Headline Generator',
        content: 'Generate compelling headlines that highlight your value proposition. Choose from multiple AI-generated options.'
      },
      {
        title: 'Summary Writer',
        content: 'Create an engaging "About" section that tells your professional story and includes relevant keywords.'
      },
      {
        title: 'Skills Optimisation',
        content: 'Get recommendations for skills to add based on your industry and target roles.'
      },
      {
        title: 'Implementation Tips',
        content: 'Follow our guide to update your LinkedIn profile with the optimised content.'
      }
    ],
    tips: [
      'Use industry keywords in your headline',
      'Keep your summary focused on value you provide',
      'Update your profile regularly',
      'Engage with content in your field'
    ]
  },
  'skills-generator': {
    title: 'Skills Generator',
    icon: Zap,
    color: '#ea580c',
    description: 'Discover relevant skills for your industry and role',
    audience: ['customer'],
    steps: [
      {
        title: 'Enter Your Role',
        content: 'Specify your current job title, target role, and industry. This helps the AI understand your context.'
      },
      {
        title: 'Review Generated Skills',
        content: 'Get a comprehensive list of technical skills, soft skills, and industry-specific competencies.'
      },
      {
        title: 'Select Relevant Skills',
        content: 'Choose the skills that match your experience and add them to your profile.'
      },
      {
        title: 'Add to CV',
        content: 'Export selected skills directly to your CV Builder or copy them for manual addition.'
      }
    ],
    tips: [
      'Focus on skills mentioned in job descriptions',
      'Balance technical and soft skills',
      'Only list skills you can demonstrate',
      'Update skills as you learn new ones'
    ]
  },
  'job-tracker': {
    title: 'Job Tracker',
    icon: Briefcase,
    color: '#6366f1',
    description: 'Track and manage your job applications in one place',
    audience: ['customer'],
    steps: [
      {
        title: 'Add Application',
        content: 'Enter job details including company, position, salary range, and application date.'
      },
      {
        title: 'Track Status',
        content: 'Update application status as you progress: Applied, Interview, Offer, Rejected, or Accepted.'
      },
      {
        title: 'Add Notes',
        content: 'Keep notes on each application including interview feedback, contact names, and follow-up dates.'
      },
      {
        title: 'Set Reminders',
        content: 'Set reminders for follow-ups and interview preparation.'
      },
      {
        title: 'Review Analytics',
        content: 'View your application statistics including response rates and time-to-interview metrics.'
      }
    ],
    tips: [
      'Update status promptly after each interaction',
      'Note key details after every interview',
      'Follow up within one week of applying',
      'Track which CV version you used for each application'
    ]
  },
  'interview-prep': {
    title: 'Interview Preparation',
    icon: MessageSquare,
    color: '#0891b2',
    description: 'Prepare for interviews with AI-powered practice and tips',
    audience: ['customer'],
    steps: [
      {
        title: 'Select Interview Type',
        content: 'Choose the type of interview: Behavioural, Technical, Case Study, or General.'
      },
      {
        title: 'Enter Job Details',
        content: 'Provide the job title, company, and description to get tailored questions.'
      },
      {
        title: 'Practice Questions',
        content: 'Review common questions and practice your responses. Use the STAR method for behavioural questions.'
      },
      {
        title: 'AI Feedback',
        content: 'Get AI feedback on your practice answers with suggestions for improvement.'
      },
      {
        title: 'Research Tips',
        content: 'Access company research tips and questions to ask the interviewer.'
      }
    ],
    tips: [
      'Use the STAR method: Situation, Task, Action, Result',
      'Prepare 3-5 stories that demonstrate key competencies',
      'Research the company\'s recent news and projects',
      'Prepare thoughtful questions to ask the interviewer'
    ]
  },
  'strategy-call': {
    title: 'Book Strategy Call',
    icon: Calendar,
    color: '#be185d',
    description: 'Schedule a one-on-one career strategy session with our experts',
    audience: ['customer'],
    steps: [
      {
        title: 'Choose Service',
        content: 'Select the type of consultation: CV Review, Career Coaching, Interview Prep, or Comprehensive Package.'
      },
      {
        title: 'Select Date & Time',
        content: 'Browse available slots and choose a time that works for you. Sessions are typically 30-60 minutes.'
      },
      {
        title: 'Provide Background',
        content: 'Fill in your career background, goals, and specific questions you\'d like to discuss.'
      },
      {
        title: 'Confirm Booking',
        content: 'Review your booking details and complete the payment to confirm your session.'
      },
      {
        title: 'Prepare for Session',
        content: 'You\'ll receive a confirmation email with preparation tips and meeting link.'
      }
    ],
    tips: [
      'Have your CV ready to share',
      'Prepare specific questions in advance',
      'Be ready to discuss your career goals',
      'Take notes during the session'
    ]
  }
};

// Reseller/Partner help sections
const resellerHelpSections = {
  'reseller-dashboard': {
    title: 'Reseller Dashboard',
    icon: Building2,
    color: '#1e40af',
    description: 'Overview of your reseller portal and key metrics',
    audience: ['reseller'],
    steps: [
      {
        title: 'Access Dashboard',
        content: 'Log in to your reseller account at /reseller-dashboard to view your business overview.'
      },
      {
        title: 'View Statistics',
        content: 'Monitor key metrics including total customers, active subscriptions, revenue, and recent activity.'
      },
      {
        title: 'Recent Activity',
        content: 'Track new sign-ups, purchases, and customer actions in real-time.'
      }
    ],
    tips: [
      'Check your dashboard daily for new sign-ups',
      'Monitor customer activity to identify engagement opportunities'
    ]
  },
  'customer-management': {
    title: 'Customer Management',
    icon: Users,
    color: '#7c3aed',
    description: 'Manage your customers and their subscriptions',
    audience: ['reseller'],
    steps: [
      {
        title: 'View Customers',
        content: 'Access the Customers page to see all your registered users with their subscription status.'
      },
      {
        title: 'Search & Filter',
        content: 'Use search and filters to find specific customers by name, email, or subscription tier.'
      },
      {
        title: 'View Details',
        content: 'Click on a customer to view their full profile, activity history, and documents.'
      },
      {
        title: 'Manage Subscriptions',
        content: 'Upgrade, downgrade, or manage customer subscription tiers as needed.'
      }
    ],
    tips: [
      'Regularly review customer activity',
      'Reach out to inactive customers',
      'Celebrate customer milestones'
    ]
  },
  'branding-setup': {
    title: 'Branding & White-Label Setup',
    icon: Sparkles,
    color: '#059669',
    description: 'Customise your partner site with your branding',
    audience: ['reseller'],
    steps: [
      {
        title: 'Upload Logo',
        content: 'Go to Settings > Branding and upload your company logo (recommended size: 200x60px).'
      },
      {
        title: 'Set Brand Colors',
        content: 'Choose your primary and secondary brand colors using the color picker.'
      },
      {
        title: 'Update Contact Info',
        content: 'Enter your business contact details including email, phone, and address.'
      },
      {
        title: 'Configure Domain',
        content: 'Set up your custom domain or subdomain for a fully branded experience.'
      },
      {
        title: 'Preview & Save',
        content: 'Preview your changes and save to apply them to your partner site.'
      }
    ],
    tips: [
      'Use high-resolution logos for best quality',
      'Choose colors that match your brand guidelines',
      'Test your partner site on mobile devices'
    ]
  }
};

const HelpCenter = () => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [downloading, setDownloading] = useState(false);

  const allSections = { ...helpSections, ...resellerHelpSections };

  const filteredSections = Object.entries(allSections).filter(([key, section]) => {
    const matchesSearch = !searchTerm || 
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || 
      (activeCategory === 'customer' && section.audience.includes('customer')) ||
      (activeCategory === 'reseller' && section.audience.includes('reseller'));
    return matchesSearch && matchesCategory;
  });

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`${API_URL}/api/help/user-manual/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'UpShift_User_Manual.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to download PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div 
        className="py-16 px-4"
        style={{ background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)` }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <BookOpen className="h-10 w-10" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-lg text-white/90 mb-8">
            Learn how to use {theme.brandName}'s powerful career tools
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg bg-white text-gray-900"
            />
          </div>

          {/* Download PDF Button */}
          <div className="mt-6">
            <Button 
              onClick={handleDownloadPDF}
              disabled={downloading}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {downloading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download User Manual (PDF)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('all')}
            style={activeCategory === 'all' ? { backgroundColor: theme.primaryColor } : {}}
          >
            All Topics
          </Button>
          <Button
            variant={activeCategory === 'customer' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('customer')}
            style={activeCategory === 'customer' ? { backgroundColor: theme.primaryColor } : {}}
          >
            <Users className="h-4 w-4 mr-2" />
            For Users
          </Button>
          <Button
            variant={activeCategory === 'reseller' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('reseller')}
            style={activeCategory === 'reseller' ? { backgroundColor: theme.primaryColor } : {}}
          >
            <Building2 className="h-4 w-4 mr-2" />
            For Partners
          </Button>
        </div>

        {/* Help Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredSections.map(([key, section]) => (
            <Card 
              key={key}
              className={`cursor-pointer transition-all hover:shadow-lg ${activeSection === key ? 'ring-2' : ''}`}
              style={{ borderColor: activeSection === key ? section.color : undefined }}
              onClick={() => setActiveSection(activeSection === key ? null : key)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${section.color}15` }}
                  >
                    <section.icon className="h-6 w-6" style={{ color: section.color }} />
                  </div>
                  <Badge variant="outline" style={{ borderColor: section.color, color: section.color }}>
                    {section.audience.includes('reseller') ? 'Partner' : 'User'}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm" style={{ color: section.color }}>
                  <span>{section.steps.length} steps</span>
                  <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${activeSection === key ? 'rotate-90' : ''}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expanded Section Detail */}
        {activeSection && allSections[activeSection] && (
          <Card className="mb-12">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${allSections[activeSection].color}15` }}
                >
                  {React.createElement(allSections[activeSection].icon, {
                    className: "h-8 w-8",
                    style: { color: allSections[activeSection].color }
                  })}
                </div>
                <div>
                  <CardTitle className="text-2xl">{allSections[activeSection].title}</CardTitle>
                  <CardDescription className="text-base">{allSections[activeSection].description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Steps */}
              <div className="space-y-6 mb-8">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Play className="h-5 w-5" style={{ color: allSections[activeSection].color }} />
                  Step-by-Step Guide
                </h3>
                {allSections[activeSection].steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                      style={{ backgroundColor: allSections[activeSection].color }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
                      <p className="text-gray-600">{step.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              {allSections[activeSection].tips && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" style={{ color: allSections[activeSection].color }} />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    {allSections[activeSection].tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: allSections[activeSection].color }} />
                        <span className="text-gray-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/contact" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <Mail className="h-6 w-6 mb-2" style={{ color: theme.primaryColor }} />
                <h4 className="font-medium">Contact Support</h4>
                <p className="text-sm text-gray-500">Get help from our team</p>
              </Link>
              <Link to="/book-strategy-call" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <Calendar className="h-6 w-6 mb-2" style={{ color: theme.primaryColor }} />
                <h4 className="font-medium">Book a Call</h4>
                <p className="text-sm text-gray-500">One-on-one consultation</p>
              </Link>
              <a 
                href="mailto:support@upshift.works" 
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HelpCircle className="h-6 w-6 mb-2" style={{ color: theme.primaryColor }} />
                <h4 className="font-medium">Email Us</h4>
                <p className="text-sm text-gray-500">support@upshift.works</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpCenter;
