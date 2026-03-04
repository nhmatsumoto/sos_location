import msgpack
import zstandard as zstd
from rest_framework.parsers import BaseParser
from rest_framework.exceptions import ParseError

class MessagePackParser(BaseParser):
    media_type = 'application/x-msgpack'

    def parse(self, stream, media_type=None, parser_context=None):
        try:
            request = parser_context.get('request') if parser_context else None
            data = stream.read()
            if request and request.META.get('HTTP_CONTENT_ENCODING') == 'zstd':
                dctx = zstd.ZstdDecompressor()
                data = dctx.decompress(data)
            return msgpack.unpackb(data, raw=False)
        except Exception as exc:
            raise ParseError('MessagePack parse error - %s' % str(exc))
