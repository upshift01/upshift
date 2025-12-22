import React, { useState } from 'react';
import { cvTemplates, articles } from '../mockData';
import TemplateCard from '../components/TemplateCard';
import ArticleCard from '../components/ArticleCard';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { Target, CheckCircle2, FileText } from 'lucide-react';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  const filteredTemplates =
    selectedCategory === 'all'
      ? cvTemplates
      : cvTemplates.filter((template) => template.category === selectedCategory);

  const handleDownload = (template) => {
    toast({
      title: "Template Downloaded!",
      description: `${template.title} has been downloaded successfully.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Resume 2024 / 2025 Modern CV Templates MS Word Docx to Download for Free
          </h1>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
            <p>
              Our website was created for the unemployed looking for a job. A number of documents are available here to guide you through the recruitment process. On the website you will find samples as well as CV templates and models that can be downloaded free of charge. We provide you with traditional and modern forms of documents to apply for different job positions. Prepare professional application documents, use tips when writing your resume, in order to gain an advantage over your competitors in the race for your dream job.
            </p>
            <p className="font-semibold">The website offers two forms of documents:</p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2">-</span>
                <span>
                  a <strong>DOCX file</strong> – an editable template to be saved on your computer's hard disc and edited using a professional text editor (MS Word),
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">-</span>
                <span>
                  a <strong>CV document Creator / Wizard / Builder</strong> – boxes to be filled out one by one on the website: personal data, contact details, education, professional experience, and additional skills. The file is then converted into the PDF format and saved on your computer's hard disc. The creator is very fast and intuitive to use. We take care of the safety of data and do not save them on the server.
                </span>
              </li>
            </ul>
            <p>
              Are you looking for a job in Great Britain (England, Scotland, Wales or Ireland) or Australia or the United States or Canada? We provide you with CV templates in English that apply in these countries. If you intend to work in Western Europe – countries like Germany, Switzerland, Austria, Belgium – we offer you a base of CV models in German plus a CV creator builder. Our recruitment documents are also used in the Netherlands, Denmark and Norway.
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-gray-700">Discover more</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Cover letter writing service',
              'PDF CV builder',
              'Resume builder',
              'Ebook guide: Job Search Strategies',
              'Online courses: Microsoft Word basics',
              'Job search platform premium access',
              'Competitive resume advantage',
              'Skills assessment tests',
              'Job interview coaching sessions',
              'Recruitment guide'
            ].map((service, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Target className="mr-1 h-3 w-3" />
                {service}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            +24 Free Word CV / Resume Templates to Download
          </h2>

          {/* Filter Tabs */}
          <div className="mb-8">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="all">All Templates</TabsTrigger>
                <TabsTrigger value="classic">Classic</TabsTrigger>
                <TabsTrigger value="modern">Modern</TabsTrigger>
                <TabsTrigger value="creative">Creative</TabsTrigger>
                <TabsTrigger value="ats">ATS-Friendly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Educational Content Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
            How to write a professional and effective CV (or a Resume)?
          </h2>
          <p className="text-gray-700 text-center mb-12 max-w-3xl mx-auto">
            Spend more time than you originally expected to create a professional CV. Every element of your CV needs to be worked out so that you can be remembered by your employer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            How to start writing a CV (or a Resume)? Read the job offer carefully!
          </h2>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
            <p>
              In every official recruitment process, or at least the vast majority, the candidate is required to send a CV. Based on the information contained therein, the employer or HR specialist checks whether the candidate meets the specified requirements, and if so, the person is invited to an interview.
            </p>
            <p className="font-semibold">The most important clues:</p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Download a CV template suitable for your sector (we have prepared classic, modern and creative examples for you to download).</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>You must know that a recruiter spends an average of 7 seconds reviewing a CV, that's not much time, so type the most important information on the first page.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Write only the relevant information in the document, appropriate to the specific job. Add information that adds value to your professional profile.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Develop the Career Summary section - the reader's attention will focus on the content of this section first.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Use listed information in your professional skills and experience, this form will make your CV more transparent.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Always post information in reverse chronological order, i.e. add the latest experience at the top of the section.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Before sending your CV to your employer, save your document in PDF format. The PDF format ensures that the recipient receives the document exactly as you saved it.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-8 px-4 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">How to Write a Cover Letter</a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">How to Write a Resume with No Work Experience</a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">How to prepare for a recruitment interview</a>
                </li>
              </ul>
            </div>
            <div>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">Swiss German CV Template</a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">German CV</a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">Professional CV / Resume Tips</a>
                </li>
              </ul>
            </div>
            <div>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">Perfect CV</a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">Skills section in CV</a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">Resume Icon Free</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;