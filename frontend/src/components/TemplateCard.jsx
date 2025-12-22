import React from 'react';
import { Eye, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const TemplateCard = ({ template, onSelect }) => {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 group">
        <img
          src={template.image}
          alt={template.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
          <Button
            onClick={() => onSelect(template)}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 hover:bg-gray-100"
            size="sm"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {template.industry}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onSelect(template)}
          variant="outline"
          className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TemplateCard;