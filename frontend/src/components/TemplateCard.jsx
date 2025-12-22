import React, { useState } from 'react';
import { Eye, Download, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const TemplateCard = ({ template, onSelect }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handlePreview = (e) => {
    e.stopPropagation();
    setShowPreview(true);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setZoom(1);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200">
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 group">
          <img
            src={template.image}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=600&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <Button
              onClick={handlePreview}
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

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
          onClick={handleClosePreview}
        >
          {/* Modal Content */}
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white rounded-t-lg px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.industry} • {template.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePreview}
                  className="ml-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              <img
                src={template.image}
                alt={template.name}
                className="max-w-full h-auto shadow-2xl rounded transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=1200&fit=crop';
                }}
              />
            </div>

            {/* Footer */}
            <div className="bg-white rounded-b-lg px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-600 max-w-md line-clamp-1">
                {template.description}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClosePreview}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleClosePreview();
                    onSelect(template);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Use This Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateCard;
