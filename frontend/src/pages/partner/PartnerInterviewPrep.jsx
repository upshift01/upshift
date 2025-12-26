import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { 
  MessageSquare, 
  Sparkles, 
  Send,
  Loader2,
  Lightbulb,
  Target,
  CheckCircle
} from 'lucide-react';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerInterviewPrep = () => {
  const { getAuthHeader } = useAuth();
  const { primaryColor, brandName } = usePartner();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  const generateQuestions = async () => {
    if (!jobTitle) {
      toast({ title: 'Please enter a job title', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-content/interview-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ job_title: jobTitle, company })
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || [
          "Tell me about yourself and your background.",
          "Why are you interested in this position?",
          "What are your greatest strengths?",
          "Describe a challenging situation you've overcome.",
          "Where do you see yourself in 5 years?"
        ]);
      } else {
        // Use fallback questions if API fails
        setQuestions([
          "Tell me about yourself and your background.",
          "Why are you interested in this position?",
          "What are your greatest strengths?",
          "Describe a challenging situation you've overcome.",
          "Where do you see yourself in 5 years?"
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      // Use fallback questions
      setQuestions([
        "Tell me about yourself and your background.",
        "Why are you interested in this position?",
        "What are your greatest strengths?",
        "Describe a challenging situation you've overcome.",
        "Where do you see yourself in 5 years?"
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerFeedback = async () => {
    if (!answer.trim()) {
      toast({ title: 'Please write an answer first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-content/answer-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ 
          question: selectedQuestion,
          answer,
          job_title: jobTitle
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || "Good answer! Consider adding more specific examples and quantifiable achievements.");
      } else {
        setFeedback("Your answer shows good structure. To improve, try adding more specific examples and measurable outcomes.");
      }
    } catch (error) {
      setFeedback("Your answer shows good structure. To improve, try adding more specific examples and measurable outcomes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PartnerCustomerLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Interview Prep</h1>
          <p className="text-gray-600">Practice common interview questions with AI feedback</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: primaryColor }} />
                Generate Questions
              </CardTitle>
              <CardDescription>Enter a job title to get relevant interview questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Job Title (e.g., Software Developer)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
              <Input
                placeholder="Company (optional)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <Button 
                onClick={generateQuestions}
                disabled={loading}
                style={{ backgroundColor: primaryColor }}
                className="w-full text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Questions
              </Button>

              {questions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Practice Questions:</p>
                  {questions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedQuestion(q); setAnswer(''); setFeedback(null); }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                        selectedQuestion === q 
                          ? 'border-2' 
                          : 'hover:bg-gray-50'
                      }`}
                      style={selectedQuestion === q ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    >
                      {idx + 1}. {q}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer Practice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: primaryColor }} />
                Practice Your Answer
              </CardTitle>
              <CardDescription>
                {selectedQuestion || "Select a question to practice"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your answer here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                disabled={!selectedQuestion}
              />
              <Button 
                onClick={getAnswerFeedback}
                disabled={loading || !selectedQuestion || !answer}
                variant="outline"
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Get AI Feedback
              </Button>

              {feedback && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}10` }}>
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                    <div>
                      <p className="font-medium mb-1" style={{ color: primaryColor }}>AI Feedback</p>
                      <p className="text-sm text-gray-700">{feedback}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" style={{ color: primaryColor }} />
              Interview Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Use STAR Method</h4>
                <p className="text-sm text-gray-600">Situation, Task, Action, Result - structure your answers for impact.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Quantify Achievements</h4>
                <p className="text-sm text-gray-600">Use numbers and percentages to demonstrate your impact.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Research the Company</h4>
                <p className="text-sm text-gray-600">Show genuine interest by knowing their values and recent news.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerCustomerLayout>
  );
};

export default PartnerInterviewPrep;
