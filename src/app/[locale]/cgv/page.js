import { createLegalPage } from '@/lib/legal-page';

export const revalidate = false;

const { generateMetadata, LegalPage } = createLegalPage('cgv');
export { generateMetadata };
export default LegalPage;
