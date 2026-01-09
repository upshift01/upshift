import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { 
  Sparkles, Loader2, Target, CheckCircle, Zap, Clock, Gift,
  FileText, Briefcase, GraduationCap, Users, Award, ChevronDown,
  ChevronUp, Copy, Check
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import FreeAccountGate from '../components/FreeAccountGate';

const SkillsGenerator = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [generatedSkills, setGeneratedSkills] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  
  const [formData, setFormData] = useState({
    industry: '',
    job_title: '',
    experience_level: '',
    soft_skills: true,
    hard_skills: true,
    transferable_skills: false,
    job_description: ''
  });

  // Fetch industries from API
  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/content/industries`);
        if (response.ok) {
          const data = await response.json();
          setIndustries(data.industries || []);
        }
      } catch (error) {
        // Fallback industries
        setIndustries([
          'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
          'Sales', 'Engineering', 'Human Resources', 'Legal', 'Retail',
          'Manufacturing', 'Hospitality', 'Construction', 'Media', 'Nonprofit'
        ]);
      }
    };
    fetchIndustries();
  }, []);

  const experienceLevels = [
    { value: 'student', label: 'Student / Fresh Graduate' },
    { value: 'entry_level', label: 'Entry Level (0-2 years)' },
    { value: 'team_lead', label: 'Team Lead (3-5 years)' },
    { value: 'manager', label: 'Manager (5-10 years)' },
    { value: 'executive', label: 'Executive (10+ years)' },
    { value: 'freelancer', label: 'Freelancer / Contractor' }
  ];

  const handleGenerateSkills = async () => {
    // Check if user is authenticated - if not, show the gate
    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }

    if (!formData.industry || !formData.job_title || !formData.experience_level) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in Industry, Job Title, and Experience Level.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.soft_skills && !formData.hard_skills && !formData.transferable_skills) {
      toast({
        title: 'Select Skill Type',
        description: 'Please select at least one type of skill to generate.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setGeneratedSkills('');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/ai-content/generate-skills`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedSkills(data.skills);
        toast({
          title: 'Skills Generated!',
          description: 'Your personalised resume skills are ready.',
        });
      } else {
        throw new Error(data.detail || 'Failed to generate skills');
      }
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySkills = () => {
    navigator.clipboard.writeText(generatedSkills);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Skills copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const faqs = [
    {
      question: 'How do I list my skills on my Resume?',
      answer: 'List down your skills in a dedicated skill section on your resume. Use bullet points for clarity. It makes it easy for hiring managers to scan through the points. Organise the skills based on the relevance to the job description, and keep the most relevant ones on the top.'
    },
    {
      question: 'How many skills should I list on my resume?',
      answer: 'Aim to include 5-6 skills that are relevant to your job description. Focus on the most important ones that demonstrate your skillset perfectly.'
    },
    {
      question: 'Should I include soft skills in my resume?',
      answer: 'Yes, you should include both soft skills and hard skills on your resume. Employers highly value soft skills like teamwork, communication, and problem-solving.'
    },
    {
      question: 'Why are keywords in the skills section important in a resume?',
      answer: 'Keywords are important because ATS systems look for those specific terms that match the job description. Including the relevant and required keywords in the skill section increases the chances of your resume being selected for further rounds.'
    },
    {
      question: 'What are strong action verbs, and why should I use them?',
      answer: 'Strong action verbs like "achieved", "managed", "developed", "analysed" etc clearly convey your responsibilities and achievements. They make your resume impactful.'
    },
    {
      question: 'Is hardworking a skill?',
      answer: 'Hardworking is considered a trait rather than a skill. Instead of adding this skill, you can use it to demonstrate your achievements through hard work.'
    }
  ];

  const benefits = [
    { icon: Target, title: 'Tailored', description: 'Skills generated are tailored to your job title and experience.' },
    { icon: CheckCircle, title: 'ATS Friendly', description: 'Each skill is ATS friendly, increasing your chances of passing automated screening.' },
    { icon: Zap, title: 'Strong Action Verbs', description: 'Powerful action verbs help make your resume stand out.' },
    { icon: Clock, title: 'Quick and Easy', description: 'Quickly generate skills without writing them from scratch.' },
    { icon: Gift, title: 'Free Tool', description: 'Our Resume Skills Generator is completely free to use.' }
  ];

  const steps = [
    { num: 1, title: 'Enter Your Designation', desc: 'Enter your job title, such as "Lead Software Engineer."' },
    { num: 2, title: 'Provide Your Experience', desc: 'Input your experience level. This helps AI create skills based on your expertise.' },
    { num: 3, title: 'Tailored to Job Description', desc: 'Provide your target job description to get skills tailored to match it.' },
    { num: 4, title: 'Generate Skills', desc: 'Click generate and our AI will create ATS-optimised skills with strong action verbs.' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Free Account Gate Modal */}
      <FreeAccountGate
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        toolName="the Skills Generator"
        redirectPath="/skills-generator"
        primaryColor="#2563eb"
      />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Free AI Tool
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            AI Resume Skills Generator
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto">
            Get the best resume skills and abilities for roles like teacher, nurse, HR, sales, and more — perfect for freshers, students, and professionals.
          </p>
        </div>
      </section>

      {/* Main Generator Section */}
      <section className="py-12 px-4 -mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Enter Your Details
                </CardTitle>
                <CardDescription>
                  Fill in your information to generate personalised skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Industry */}
                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Title */}
                <div>
                  <Label htmlFor="job_title">Job Title *</Label>
                  <Input
                    id="job_title"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  />
                </div>

                {/* Experience Level */}
                <div>
                  <Label htmlFor="experience">Experience Level *</Label>
                  <Select
                    value={formData.experience_level}
                    onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skill Types */}
                <div>
                  <Label className="mb-3 block">Skill Types</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="soft_skills"
                        checked={formData.soft_skills}
                        onCheckedChange={(checked) => setFormData({ ...formData, soft_skills: checked })}
                      />
                      <label htmlFor="soft_skills" className="text-sm cursor-pointer">Soft Skills</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hard_skills"
                        checked={formData.hard_skills}
                        onCheckedChange={(checked) => setFormData({ ...formData, hard_skills: checked })}
                      />
                      <label htmlFor="hard_skills" className="text-sm cursor-pointer">Hard Skills</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="transferable_skills"
                        checked={formData.transferable_skills}
                        onCheckedChange={(checked) => setFormData({ ...formData, transferable_skills: checked })}
                      />
                      <label htmlFor="transferable_skills" className="text-sm cursor-pointer">Transferable Skills</label>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <Label htmlFor="job_description">
                    Job Description 
                    <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>
                  </Label>
                  <Textarea
                    id="job_description"
                    placeholder="Paste the job description here to get skills tailored to the specific role..."
                    value={formData.job_description}
                    onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                    rows={5}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Adding a job description helps generate more relevant, ATS-optimised skills.
                  </p>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateSkills}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating Skills...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Skills
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Area */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    Generated Skills
                  </CardTitle>
                  {generatedSkills && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySkills}
                      className="gap-2"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Your AI-generated resume skills will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedSkills ? (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] whitespace-pre-wrap text-sm leading-relaxed">
                    {generatedSkills}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center text-center text-gray-400">
                    <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Your skills will appear here</p>
                    <p className="text-sm mt-2">Fill in the form and click "Generate Skills"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Boost Your Resume with Personalised Skills Section
          </h2>
          <div className="space-y-6 text-gray-600">
            <p className="text-lg leading-relaxed">
              Need help to create a compelling skill section for your resume? Many job seekers find it challenging to craft a perfect skills section. Without using the right keywords and action verbs, your resume might not even pass through the Application Tracking System (ATS).
            </p>
            <p className="text-lg leading-relaxed">
              This can be frustrating especially when you have skills but don't know how to put them in your resume properly. To solve this problem, we have come up with a tool that generates the skills section for you — Resume Skills Generator from UpShift.
            </p>
            <p className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600 text-lg leading-relaxed">
              According to JobScan's report, <strong>over 98% of the top 500 companies use ATS</strong> to filter out resumes for interviews. Resumes optimised with the right keywords and skills have a <strong>30% higher chance of passing ATS filters</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            How Does the Resume Skills Generator Work?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Creating a perfect skills section for your resume is simple with our AI Resume Skills Generator.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="bg-white rounded-xl p-6 shadow-md h-full">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mb-4">
                    {step.num}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Why Choose Our Resume Skills Generator?
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Using our Resume Skills Generator boosts your resume, enhancing your job search efforts.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ATS Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            ATS Friendly Skills & Using Action Verbs in your Resume
          </h2>
          <div className="space-y-6">
            <p className="text-lg leading-relaxed text-blue-50">
              In today's job market, most companies use ATS systems to filter resumes before they reach human recruiters. Therefore, having an ATS-friendly resume is important to pass the initial screening stage.
            </p>
            <p className="text-lg leading-relaxed text-blue-50">
              Action verbs like "managed," "developed," "analysed," and "designed" clearly convey your accomplishments and responsibilities. These verbs make your resume more engaging and appealing. They help you not only pass the ATS but also make a favourable impression on hiring managers.
            </p>
            <p className="bg-white/10 p-6 rounded-lg text-lg leading-relaxed">
              Our AI Resume Skill Generator tool focuses on ATS-friendly language and crafts the skills section with strong action verbs to enhance your resume capabilities and effectiveness.
            </p>
          </div>
        </div>
      </section>

      {/* Example Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Example Resume Skills for Various Roles
          </h2>
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Nursing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Proficient in patient care, monitoring vital signs, and providing post-operative care.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Experienced in using EHR systems to maintain patient health records.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Effective at handling emergency situations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Knowledgeable in infection control practices and maintaining a sterile environment.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Do's and Don'ts */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            What Makes the Resume Skills Section Stronger?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-red-600">Don'ts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    Don't list irrelevant skills
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    Don't overload with jargon
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    Don't include outdated skills
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    Don't overstate your skills
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="text-green-600">Do's</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Use bullet points to showcase skills
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Include both hard and soft skills
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Keep it concise and categorise skills
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Tailor skills to match the job description
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card 
                key={idx} 
                className="border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium pr-4">{faq.question}</h3>
                    {expandedFaq === idx ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  {expandedFaq === idx && (
                    <p className="mt-3 text-gray-600 text-sm">{faq.answer}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Boost Your Resume?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Generate ATS-friendly skills tailored to your role in seconds.
          </p>
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Generate Skills Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SkillsGenerator;
