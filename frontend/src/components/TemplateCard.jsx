import React from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

const TemplateCard = ({ template, onDownload }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-200">
        <img
          src={template.image}
          alt={template.title}
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <CardDescription className="text-sm line-clamp-3">
          {template.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          onClick={() => onDownload(template)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          download [MS WORD]
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TemplateCard;