import { extendTheme } from '@chakra-ui/react';
import { components } from './components';
import { config, foundations } from './foundations';

const theme = extendTheme({
  config,
  components,
  ...foundations,
});

export default theme;
