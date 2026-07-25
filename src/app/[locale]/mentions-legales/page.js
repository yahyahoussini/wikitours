import { createLegalPage } from '@/lib/legal-page';

export const revalidate = false;

const { generateMetadata, LegalPage } = createLegalPage('mentions-legales');
export { generateMetadata };
export default LegalPage;
