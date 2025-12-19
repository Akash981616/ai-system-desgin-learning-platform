import { Document } from '@langchain/core/documents';

/**
 * Formats a list of documents as a string.
 * @param documents List of documents to format.
 * @param separator Separator to use between documents. Defaults to "\n\n".
 * @returns A string representation of the documents.
 */
export const formatDocumentsAsString = (
  documents: Document[],
  separator = '\n\n',
): string => documents.map((doc) => doc.pageContent).join(separator);
