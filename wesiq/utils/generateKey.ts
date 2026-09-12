const NUMBERS_CHAR_CODES:number[] = fromToNumbers(48, 57) // 0 - 9
const CAPITAL_LETTERS_CHAR_CODES:number[] = fromToNumbers(65, 90) // A - Z
const SMALL_LETTERS_CHAR_CODES:number[] = fromToNumbers(97, 122) // a - z
const CHARACTERS_CHAR_CODES:number[] = fromToNumbers(33, 47).concat(fromToNumbers(58, 64)).concat(fromToNumbers(91, 96)).concat(fromToNumbers(123, 126)) // Characters Char Codes

// Function For Create An Array From The Selected Range
function fromToNumbers(from:number, to:number):number[] {
    const all_numbers:number[] = [] // Stores All Numbers

    for(let i:number = from; i <= to; i++) {
        all_numbers.push(i) // Pushes A Number To All Numbers
    }

    return all_numbers // Returns An Array Of All Numbers
}

// Function For Generate Random Key
export function generateKey(length:number, numbers:boolean = true, capital_letters:boolean = true, small_letters:boolean = true, characters:boolean = true):string {
    const all_characters:string[] = [] // Stores All Characters

    // Selects Characters
    if(numbers) {
        NUMBERS_CHAR_CODES.forEach(function(one_code:number) {
            all_characters.push(String.fromCharCode(one_code))
        })
    }

    if(capital_letters) {
        CAPITAL_LETTERS_CHAR_CODES.forEach(function(one_code:number) {
            all_characters.push(String.fromCharCode(one_code))
        })
    }

    if(small_letters) {
        SMALL_LETTERS_CHAR_CODES.forEach(function(one_code:number) {
            all_characters.push(String.fromCharCode(one_code))
        })
    }

    if(characters) {
        CHARACTERS_CHAR_CODES.forEach(function(one_code:number) {
            all_characters.push(String.fromCharCode(one_code))
        })
    }

    const generated_key:string[] = [] // Stores Generated Key

    for(let i:number = 0; i < length; i++) {
        const all_characters_index:number = Math.floor(Math.random() * all_characters.length - 1) + 1 // Generates Random Index From Array Of All Characters

        if(all_characters[all_characters_index]) generated_key.push(all_characters[all_characters_index]) // Pushes A Character To The Generated Key
    }

    return generated_key.join("") // Returns Generated Key
}