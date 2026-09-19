import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TutorDocument, documentLabel, getDocumentLink } from '@/lib/tutorDocuments';

interface Props {
  documents: TutorDocument[];
}

const TutorDocumentsReview: React.FC<Props> = ({ documents }) => {
  const { toast } = useToast();

  const open = async (doc: TutorDocument) => {
    const link = await getDocumentLink(doc.url);
    if (link) window.open(link, '_blank', 'noopener');
    else
      toast({
        variant: 'destructive',
        title: 'Could not open document',
        description: 'The file may have been removed by the applicant.',
      });
  };

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
        <FileText className="w-3 h-3" /> Identity & Qualification Documents
      </p>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded.</p>
      ) : (
        <div className="space-y-1">
          {documents.map((doc) => (
            <div
              key={doc.url}
              className="flex items-center gap-2 p-2 rounded-lg border border-border/50"
            >
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{documentLabel(doc.type)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => open(doc)}>
                <Eye className="w-3 h-3 mr-1" /> View
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorDocumentsReview;
