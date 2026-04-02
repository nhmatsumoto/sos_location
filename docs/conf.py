# Configuration file for the Sphinx documentation builder.

import os
import sys

# -- Project information -----------------------------------------------------

project = 'SOS Location'
copyright = '2026, SOS Location Team'
author = 'SOS Location Team'
release = '2.0'

# -- General configuration ---------------------------------------------------

extensions = [
    'myst_parser',
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx.ext.viewcode',
    'sphinx_copybutton',
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

# -- Options for HTML output -------------------------------------------------

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

# MyST-Parser configuration
myst_enable_extensions = [
    "amsmath",
    "colon_fence",
    "deflist",
    "dollarmath",
    "fieldlist",
    "html_admonition",
    "html_image",
    "linkify",
    "replacements",
    "smartquotes",
    "strikethrough",
    "substitution",
    "tasklist",
]

# MathJax configuration:
# - keep MyST dollar/ams math support
# - add AsciiMath using [= ... =] delimiters, which are Markdown-safe
mathjax3_config = {
    "loader": {
        "load": ["input/asciimath", "[tex]/ams"],
    },
    "tex": {
        "packages": {"[+]": ["ams"]},
    },
    "asciimath": {
        "delimiters": [["[=", "=]"]],
    },
}
