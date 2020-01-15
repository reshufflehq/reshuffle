import { find, Q } from '@reshuffle/db';
import { DB } from '@reshuffle/db/dist/db';
import { Document } from '@reshuffle/interfaces-node-client/interfaces';

export interface IteratorProps {
  chunkSize: number;
}

const defaultIteratorProps: IteratorProps = {
  chunkSize: 100000,
};

export async function* iterateFind(
  query: Q.Query, iteratorProps?: Partial<IteratorProps>, db?: DB,
): AsyncIterableIterator<Document> {
  const doFind = db ? db.find.bind(db) : find;
  const { chunkSize } = { ...defaultIteratorProps, ...iteratorProps };

  let offset = 0;
  let docs: Document[];
  do {
    const nextQuery = query.limit(chunkSize).skip(offset);
    docs = await doFind(nextQuery);
    for (const doc of docs) yield doc;
    offset += docs.length;
  } while (docs.length > 0);
}
