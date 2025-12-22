import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const ArticleCard = ({ article }) => {
  const IconComponent = Icons[article.icon] || Icons.FileText;

  return (
    <Link to={article.link}>
      <Card className="h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer">
        <CardHeader className="text-center pb-3">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <IconComponent className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-base">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-center">
            {article.description}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ArticleCard;