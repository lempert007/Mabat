"""Content block types. A POI's body is an ordered list of these."""

from typing import Annotated, Literal

from pydantic import Field

from app.schemas.common import ApiModel


class BlockBase(ApiModel):
    id: str = Field(min_length=1, max_length=64)


class HeadingBlock(BlockBase):
    type: Literal["heading"]
    text: str = ""


class TextBlock(BlockBase):
    type: Literal["text"]
    markdown: str = ""


class SpecItem(ApiModel):
    label: str = ""
    value: str = ""


class SpecsBlock(BlockBase):
    type: Literal["specs"]
    items: list[SpecItem] = []


class TableBlock(BlockBase):
    type: Literal["table"]
    columns: list[str] = []
    rows: list[list[str]] = []


class ImageItem(ApiModel):
    attachment_id: str
    caption: str = ""


class ImagesBlock(BlockBase):
    type: Literal["images"]
    items: list[ImageItem] = []


class DocumentItem(ApiModel):
    attachment_id: str
    title: str = ""


class DocumentsBlock(BlockBase):
    type: Literal["documents"]
    items: list[DocumentItem] = []


class LinkBlock(BlockBase):
    type: Literal["link"]
    url: str = ""
    label: str = ""


# Blocks that carry content. These are what a section is allowed to contain.
ContentBlock = Annotated[
    HeadingBlock | TextBlock | SpecsBlock | TableBlock | ImagesBlock | DocumentsBlock | LinkBlock,
    Field(discriminator="type"),
]


class SectionBlock(BlockBase):
    """A named, collapsible group of content blocks. Sections never nest."""

    type: Literal["section"]
    title: str = ""
    default_open: bool = True
    blocks: list[ContentBlock] = []


Block = Annotated[
    HeadingBlock
    | TextBlock
    | SpecsBlock
    | TableBlock
    | ImagesBlock
    | DocumentsBlock
    | LinkBlock
    | SectionBlock,
    Field(discriminator="type"),
]
