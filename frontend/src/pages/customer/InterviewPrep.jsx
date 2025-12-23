import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  MessageSquare, 
  Sparkles, 
  Send, 
  Loader2,
  Lightbulb,
  Target,
  Users,
  Clock,
  CheckCircle,
  ChevronRight,
  BookOpen
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const InterviewPrep = () => {
  const { getAuthHeader } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  const topics = [
    { id: 'behavioural', name: 'Behavioural Questions', icon: Users, color: 'blue', description: 'STAR method questions about past experiences' },
    { id: 'technical', name: 'Technical Questions', icon: Target, color: 'purple', description: 'Role-specific technical knowledge' },
    { id: 'situational', name: 'Situational Questions', icon: Lightbulb, color: 'green', description: 'How would you handle scenarios' },
    { id: 'common', name: 'Common Questions', icon: MessageSquare, color: 'orange', description: 'Tell me about yourself, strengths/weaknesses' }
  ];

  const handleGenerateQuestions = async () => {
    if (!jobTitle) {
      alert('Please enter a job title');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/customer/interview-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          job_title: jobTitle,
          company: company,
          question_type: selectedTopic
        })
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setCurrentQuestion(0);
        setFeedback(null);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetFeedback = async () => {
    if (!userAnswer.trim()) {
      alert('Please provide an answer first');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/customer/interview-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          question: questions[currentQuestion],
          answer: userAnswer,
          job_title: jobTitle
        })
      });
      if (response.ok) {
        const data = await response.json();
        setFeedback(data);
      }
    } catch (error) {
      console.error('Error getting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setUserAnswer('');
      setFeedback(null);
    }
  };

  const resetPractice = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setUserAnswer('');
    setFeedback(null);
    setSelectedTopic(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interview Preparation</h1>
        <p className="text-gray-600">Practice with AI-generated questions and get feedback</p>
      </div>

      {!selectedTopic ? (
        <>
          {/* Topic Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Choose Interview Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`p-4 border-2 rounded-lg text-left hover:border-${topic.color}-500 hover:bg-${topic.color}-50 transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 bg-${topic.color}-100 rounded-lg`}>
                        <topic.icon className={`h-6 w-6 text-${topic.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{topic.name}</h3>
                        <p className="text-sm text-gray-500">{topic.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Interview Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'Research the company thoroughly before the interview',
                  'Use the STAR method for behavioural questions',
                  'Prepare questions to ask the interviewer',
                  'Practice your answers out loud',
                  'Dress professionally and arrive early'
                ].map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : questions.length === 0 ? (
        /* Job Details Input */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generate Interview Questions</span>
              <Badge>{topics.find(t => t.id === selectedTopic)?.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title *</label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Software Developer, Marketing Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company (Optional)</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Google, Standard Bank"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetPractice}>
                Back
              </Button>
              <Button onClick={handleGenerateQuestions} disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate Questions</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Practice Session */
        <div className="space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              Question {currentQuestion + 1} of {questions.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={resetPractice}>
              Start Over
            </Button>
          </div>

          {/* Question Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <MessageSquare className="h-5 w-5 inline mr-2" />
                {questions[currentQuestion]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here... Practice makes perfect!"
                className="w-full min-h-[150px] p-3 border rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleGetFeedback} disabled={loading || !userAnswer.trim()}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Get AI Feedback</>
                  )}
                </Button>
                {currentQuestion < questions.length - 1 && (
                  <Button variant="outline" onClick={handleNextQuestion}>
                    Next Question <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          {feedback && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Lightbulb className="h-5 w-5" />
                  AI Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-green-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full" 
                        style={{ width: `${feedback.score || 70}%` }}
                      />
                    </div>
                    <span className="font-bold text-green-800">{feedback.score || 70}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Strengths</h4>
                  <p className="text-green-700 text-sm">{feedback.strengths || 'Good structure and relevant examples.'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Areas for Improvement</h4>
                  <p className="text-green-700 text-sm">{feedback.improvements || 'Consider adding more specific metrics and outcomes.'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Suggested Answer</h4>
                  <p className="text-green-700 text-sm bg-white p-3 rounded-lg">{feedback.suggested || 'A strong answer would include specific examples with measurable results...'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewPrep;
