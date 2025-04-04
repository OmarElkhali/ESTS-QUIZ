
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useQuiz } from "@/hooks/useQuiz";
import { toast } from "sonner";

interface DeleteQuizDialogProps {
  quizId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteQuizDialog = ({
  quizId,
  open,
  onOpenChange,
}: DeleteQuizDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteQuiz } = useQuiz();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteQuiz(quizId);
      toast.success("Quiz supprimé avec succès");
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Impossible de supprimer le quiz");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce quiz?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action ne peut pas être annulée. Ce quiz sera définitivement supprimé
            de notre serveur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
          >
            {isDeleting ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
