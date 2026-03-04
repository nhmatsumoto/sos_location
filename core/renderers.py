import msgpack
import zstandard as zstd
from rest_framework.renderers import BaseRenderer

class MessagePackRenderer(BaseRenderer):
    media_type = 'application/x-msgpack'
    format = 'msgpack'
    render_style = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b''
        
        packed = msgpack.packb(data, use_bin_type=True)
        
        # Check if client supports zstd compression
        request = renderer_context.get('request') if renderer_context else None
        if request and 'zstd' in request.META.get('HTTP_ACCEPT_ENCODING', ''):
            cctx = zstd.ZstdCompressor()
            compressed = cctx.compress(packed)
            response = renderer_context.get('response')
            if response:
                response['Content-Encoding'] = 'zstd'
            return compressed
            
        return packed
